import { useState, useCallback, useRef } from 'react'
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

async function fetchCart(): Promise<CartData> {
  const response = await fetch('/api/cart')
  if (!response.ok) {
    throw new Error('Failed to fetch cart')
  }
  return response.json()
}

export function useCart() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Optimistic state for cart count
  const [optimisticCartCount, setOptimisticCartCount] = useState<number | null>(null)
  
  // Get current cart data
  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!session,
  })

  // Get cart count for navbar
  const { data: cartCount = 0 } = useQuery({
    queryKey: ['cart', 'count'],
    queryFn: async () => {
      const response = await fetch('/api/cart')
      if (!response.ok) {
        throw new Error('Failed to fetch cart')
      }
      const data = await response.json()
      return data.items?.length || 0
    },
    enabled: !!session,
    refetchOnWindowFocus: false,
  })

  // Optimistic add to cart
  const addToCartOptimistic = useCallback(async (productId: string, quantity: number = 1) => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Immediately update UI optimistically
    const currentCount = optimisticCartCount ?? cartCount
    setOptimisticCartCount(currentCount + 1)
    
    // Update cart data optimistically
    queryClient.setQueryData(['cart'], (oldData: CartData | undefined) => {
      if (!oldData) return oldData
      
      // Check if item already exists
      const existingItemIndex = oldData.items.findIndex(
        item => item.product.id === productId
      )
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const newItems = [...oldData.items]
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity
        }
        
        const newTotal = newItems.reduce((sum, item) => 
          sum + (Number(item.product.price) * item.quantity), 0
        )
        
        return {
          items: newItems,
          total: newTotal
        }
      } else {
        // Add new item (we'll need to fetch product details)
        // For now, just return old data and let the API call handle it
        return oldData
      }
    })

    // Show immediate feedback
    toast.success("Added to cart!")

    // Make actual API call
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to add to cart')
      }
      
      // Invalidate queries to get fresh data
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] })
      
      // Reset optimistic count
      setOptimisticCartCount(null)
    } catch {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] })
      setOptimisticCartCount(null)
      toast.error("Failed to add to cart")
    }
  }, [session, router, queryClient, cartCount, optimisticCartCount])

  // Debounced update quantity
  const debouncedUpdateQuantity = useDebounce(async (productId: string, quantityChange: number) => {
    if (!session) return

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity: quantityChange }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update quantity')
      }
      
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] })
    } catch {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] })
      toast.error("Failed to update cart")
    }
  }, 500) // 500ms debounce

  // Optimistic update quantity
  const updateQuantityOptimistic = useCallback((productId: string, quantityChange: number) => {
    if (!session) return

    // Immediately update UI
    queryClient.setQueryData(['cart'], (oldData: CartData | undefined) => {
      if (!oldData) return oldData
      
      const itemIndex = oldData.items.findIndex(
        item => item.product.id === productId
      )
      
      if (itemIndex >= 0) {
        const newItems = [...oldData.items]
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
        
        return {
          items: newItems,
          total: newTotal
        }
      }
      
      return oldData
    })

    // Show immediate feedback
    toast.success("Cart updated")

    // Debounced API call
    debouncedUpdateQuantity(productId, quantityChange)
  }, [session, queryClient, cartCount, debouncedUpdateQuantity])

  // Optimistic remove item
  const removeItemOptimistic = useCallback(async (itemId: string) => {
    if (!session) return

    // Immediately update UI
    queryClient.setQueryData(['cart'], (oldData: CartData | undefined) => {
      if (!oldData) return oldData
      
      const newItems = oldData.items.filter(item => item.id !== itemId)
      const newTotal = newItems.reduce((sum, item) => 
        sum + (Number(item.product.price) * item.quantity), 0
      )
      
      setOptimisticCartCount(prev => Math.max(0, (prev ?? cartCount) - 1))
      
      return {
        items: newItems,
        total: newTotal
      }
    })

    // Show immediate feedback
    toast.success("Item removed from cart")

    // Make API call
    try {
      const response = await fetch(`/api/cart?itemId=${itemId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove item')
      }
      
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] })
      setOptimisticCartCount(null)
    } catch {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['cart', 'count'] })
      setOptimisticCartCount(null)
      toast.error("Failed to remove item from cart")
    }
  }, [session, queryClient, cartCount])

  return {
    cart,
    cartCount: optimisticCartCount ?? cartCount,
    isLoading,
    error,
    addToCart: addToCartOptimistic,
    updateQuantity: updateQuantityOptimistic,
    removeItem: removeItemOptimistic,
  }
}
