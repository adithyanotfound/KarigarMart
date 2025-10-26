import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface CartItem {
  id: string
  quantity: number
  product: {
    id: string
    title: string
    price: number
    imageUrl: string
    description?: string
    artisan: {
      user: {
        name: string
      }
    }
  }
}

interface CartData {
  items: CartItem[]
  total: number
}

// Local storage utilities
const CART_CACHE_KEY = 'karigarmart_cart_cache'
const CART_CACHE_EXPIRY = 'karigarmart_cart_expiry'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedCart(): CartData | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(CART_CACHE_KEY)
    const expiry = localStorage.getItem(CART_CACHE_EXPIRY)
    
    if (!cached || !expiry) return null
    
    const expiryTime = parseInt(expiry, 10)
    if (Date.now() > expiryTime) {
      localStorage.removeItem(CART_CACHE_KEY)
      localStorage.removeItem(CART_CACHE_EXPIRY)
      return null
    }
    
    return JSON.parse(cached)
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

function setCachedCart(cart: CartData): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cart))
    localStorage.setItem(CART_CACHE_EXPIRY, (Date.now() + CACHE_DURATION).toString())
  } catch (error) {
    console.error('Error caching cart:', error)
  }
}

function clearCartCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CART_CACHE_KEY)
  localStorage.removeItem(CART_CACHE_EXPIRY)
}

// Debounce utility
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T
}

// Retry utility with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  retryDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // If successful or client error (4xx), return immediately
      if (response.ok || response.status >= 400) {
        return response
      }
      
      // Only retry on server errors (5xx) or network failures
      lastError = new Error(`Request failed with status ${response.status}`)
    } catch (error) {
      lastError = error as Error
    }
    
    // Don't retry on the last attempt
    if (attempt < maxRetries - 1) {
      const delay = retryDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

async function fetchCart(): Promise<CartData> {
  const response = await fetchWithRetry('/api/cart')
  if (!response.ok) {
    throw new Error('Failed to fetch cart')
  }
  const data = await response.json()
  setCachedCart(data)
  return data
}

// Fetch product details for optimistic updates
async function fetchProduct(productId: string): Promise<any> {
  const response = await fetch(`/api/products/${productId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch product')
  }
  return response.json()
}

export function useCart() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Optimistic state for cart count
  const [optimisticCartCount, setOptimisticCartCount] = useState<number | null>(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  
  // Initialize from cache on mount for instant UI
  useEffect(() => {
    if (session) {
      const cached = getCachedCart()
      if (cached) {
        queryClient.setQueryData(['cart'], cached)
        queryClient.setQueryData(['cart', 'count'], cached.items?.length || 0)
      }
    }
  }, [session, queryClient])
  
  // Get current cart data with cache-first strategy
  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!session,
    staleTime: CACHE_DURATION,
    initialData: getCachedCart(),
    refetchOnWindowFocus: false,
    onError: () => {
      // Use cached data on error
      const cached = getCachedCart()
      if (cached) {
        queryClient.setQueryData(['cart'], cached)
      }
    },
  })

  // Sync in background on mount and when cart changes from server
  useEffect(() => {
    if (session) {
      // Background sync
      fetchCart().catch(() => {
        // Silent fail in background
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])
  
  // Sync cart data to localStorage whenever it changes
  useEffect(() => {
    if (cart && !cart.items.some(item => item.id.startsWith('temp-'))) {
      setCachedCart(cart)
    }
  }, [cart])

  // Get cart count for navbar - derive from cart data
  const cartCount = cart?.items?.length || 0

  // Optimistic add to cart with product fetching
  const addToCartOptimistic = useCallback(async (productId: string, quantity: number = 1) => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    setIsAddingToCart(true)
    
    // Get current cart data
    const oldData = queryClient.getQueryData<CartData>(['cart'])
    
    // Check if item already exists
    const existingItemIndex = oldData?.items.findIndex(
      item => item.product.id === productId
    )

    // Immediately update UI optimistically
    const currentCount = optimisticCartCount ?? cartCount
    setOptimisticCartCount(currentCount + (existingItemIndex >= 0 ? 0 : 1))
    
    // Fetch product details if it's a new item
    let productDetails: any = null
    if (existingItemIndex < 0) {
      try {
        productDetails = await fetchProduct(productId)
      } catch (error) {
        // If we can't fetch product, we'll still try to add but with limited UI update
        console.error('Failed to fetch product details:', error)
      }
    }
    
    // Update cart data optimistically
    queryClient.setQueryData(['cart'], (currentData: CartData | undefined) => {
      if (!currentData) {
        // No existing cart data, create new optimistic cart
        if (!productDetails) return currentData
        
        const newItem: CartItem = {
          id: `temp-${productId}-${Date.now()}`, // temporary ID
          quantity,
          product: productDetails
        }
        
        const newTotal = Number(productDetails.price) * quantity
        return {
          items: [newItem],
          total: newTotal
        }
      }
      
      const existingItemIdx = currentData.items.findIndex(
        item => item.product.id === productId
      )
      
      if (existingItemIdx >= 0) {
        // Update existing item
        const newItems = [...currentData.items]
        newItems[existingItemIdx] = {
          ...newItems[existingItemIdx],
          quantity: newItems[existingItemIdx].quantity + quantity
        }
        
        const newTotal = newItems.reduce((sum, item) => 
          sum + (Number(item.product.price) * item.quantity), 0
        )
        
        return {
          items: newItems,
          total: newTotal
        }
      } else {
        // Add new item
        if (!productDetails) return currentData
        
        const newItem: CartItem = {
          id: `temp-${productId}-${Date.now()}`,
          quantity,
          product: productDetails
        }
        
        const newItems = [...currentData.items, newItem]
        const newTotal = newItems.reduce((sum, item) => 
          sum + (Number(item.product.price) * item.quantity), 0
        )
        
        return {
          items: newItems,
          total: newTotal
        }
      }
    })

    // Show immediate feedback
    toast.success("Added to cart!")

    // Make actual API call with retry
    try {
      const response = await fetchWithRetry('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to add to cart')
      }
      
      const newCartItem = await response.json()
      
      // Update the temporary ID with real ID and use server data
      queryClient.setQueryData(['cart'], (currentData: CartData | undefined) => {
        if (!currentData) return currentData
        
        // Check if this product was just added or if it existed before
        const existingItemIndex = currentData.items.findIndex(
          item => item.product.id === productId
        )
        
        if (existingItemIndex >= 0) {
          // Update existing item with real ID from server
          const newItems = [...currentData.items]
          
          // If it was a temp item, replace with server item
          if (newItems[existingItemIndex].id.startsWith('temp-')) {
            newItems[existingItemIndex] = {
              id: newCartItem.id,
              quantity: newItems[existingItemIndex].quantity,
              product: newCartItem.product
            }
          } else {
            // Update quantity for existing item
            newItems[existingItemIndex] = {
              ...newItems[existingItemIndex],
              quantity: newItems[existingItemIndex].quantity + quantity
            }
          }
          
          // Recalculate total
          const newTotal = newItems.reduce((sum, item) => 
            sum + (Number(item.product.price) * item.quantity), 0
          )
          
          return {
            items: newItems,
            total: newTotal
          }
        }
        
        return currentData
      })
      
      // Final sync with server in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      
      // Reset optimistic count
      setOptimisticCartCount(null)
    } catch (error) {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      setOptimisticCartCount(null)
      toast.error("Failed to add to cart. Please try again.")
    } finally {
      setIsAddingToCart(false)
    }
  }, [session, router, queryClient, cartCount, optimisticCartCount])

  // Debounced update quantity with retry
  const debouncedUpdateQuantity = useDebounce(async (productId: string, quantityChange: number) => {
    if (!session) return

    try {
      const response = await fetchWithRetry('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity: quantityChange }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update quantity')
      }
      
      // Refresh cart data from server
      const updatedCart = await fetchCart()
      queryClient.setQueryData(['cart'], updatedCart)
    } catch {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      const cached = getCachedCart()
      if (cached) {
        queryClient.setQueryData(['cart'], cached)
      }
      toast.error("Failed to update cart")
    }
  }, 500) // 500ms debounce

  // Optimistic update quantity
  const updateQuantityOptimistic = useCallback((productId: string, quantityChange: number) => {
    if (!session) return

    // Get current cart data
    const oldData = queryClient.getQueryData<CartData>(['cart'])
    if (!oldData) return

    // Immediately update UI
    queryClient.setQueryData(['cart'], (currentData: CartData | undefined) => {
      if (!currentData) return currentData
      
      const itemIndex = currentData.items.findIndex(
        item => item.product.id === productId
      )
      
      if (itemIndex >= 0) {
        const newItems = [...currentData.items]
        const newQuantity = newItems[itemIndex].quantity + quantityChange
        
        if (newQuantity <= 0) {
          // Remove item
          newItems.splice(itemIndex, 1)
          setOptimisticCartCount(prev => Math.max(0, (prev ?? cartCount) - 1))
        } else {
          // Update quantity
          newItems[itemIndex] = {
            ...newItems[itemIndex],
            quantity: newQuantity
          }
        }
        
        const newTotal = newItems.reduce((sum, item) => 
          sum + (Number(item.product.price) * item.quantity), 0
        )
        
        const updatedCart = {
          items: newItems,
          total: newTotal
        }
        
        // Update cache
        setCachedCart(updatedCart)
        
        return updatedCart
      }
      
      return currentData
    })

    // Debounced API call
    debouncedUpdateQuantity(productId, quantityChange)
  }, [session, queryClient, cartCount, debouncedUpdateQuantity])

  // Optimistic remove item with retry
  const removeItemOptimistic = useCallback(async (itemId: string) => {
    if (!session) return

    // Get old data for potential rollback
    const oldData = queryClient.getQueryData<CartData>(['cart'])

    // Immediately update UI
    queryClient.setQueryData(['cart'], (currentData: CartData | undefined) => {
      if (!currentData) return currentData
      
      const newItems = currentData.items.filter(item => item.id !== itemId)
      const newTotal = newItems.reduce((sum, item) => 
        sum + (Number(item.product.price) * item.quantity), 0
      )
      
      setOptimisticCartCount(prev => Math.max(0, (prev ?? cartCount) - 1))
      
      const updatedCart = {
        items: newItems,
        total: newTotal
      }
      
      // Update cache
      setCachedCart(updatedCart)
      
      return updatedCart
    })

    // Show immediate feedback
    toast.success("Item removed from cart")

    // Make API call with retry
    try {
      const response = await fetchWithRetry(`/api/cart?itemId=${itemId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove item')
      }
      
      // Sync with server
      const updatedCart = await fetchCart()
      queryClient.setQueryData(['cart'], updatedCart)
      setOptimisticCartCount(null)
    } catch {
      // Revert on error - restore from cache or old data
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      const cached = getCachedCart()
      if (cached) {
        queryClient.setQueryData(['cart'], cached)
      } else if (oldData) {
        queryClient.setQueryData(['cart'], oldData)
        setCachedCart(oldData)
      }
      setOptimisticCartCount(null)
      toast.error("Failed to remove item from cart")
    }
  }, [session, queryClient, cartCount])

  return {
    cart,
    cartCount: optimisticCartCount ?? cartCount,
    isLoading,
    isAddingToCart,
    error,
    addToCart: addToCartOptimistic,
    updateQuantity: updateQuantityOptimistic,
    removeItem: removeItemOptimistic,
  }
}
