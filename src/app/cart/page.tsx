"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import Image from "next/image"

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

async function fetchCart(): Promise<CartData> {
  const response = await fetch('/api/cart')
  if (!response.ok) {
    throw new Error('Failed to fetch cart')
  }
  return response.json()
}

export default function CartPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()

  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!session,
  })

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/cart?itemId=${itemId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove item')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success("Item removed from cart")
    },
    onError: (error: Error) => {
      toast.error("Failed to remove item from cart")
    },
  })

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update quantity')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success("Cart updated")
    },
    onError: (error: Error) => {
      toast.error("Failed to update cart")
    },
  })


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading cart...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Error loading cart</div>
      </div>
    )
  }

  const handleCheckout = () => {
    if (cart && cart.items.length > 0) {
      router.push(`/payment?total=${cart.total.toFixed(2)}`)
    }
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-foreground"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </Button>
          <h1 className="font-semibold text-foreground">Shopping Cart</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </div>

      <div className="pb-32">
        {cart && cart.items.length > 0 ? (
          <div className="p-4 space-y-4">
            {cart.items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {item.product.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          by {item.product.artisan.user.name}
                        </p>
                        <p className="text-lg font-semibold text-black mt-1">
                          ${item.product.price}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItemMutation.mutate(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </Button>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateQuantityMutation.mutate({
                                  productId: item.product.id,
                                  quantity: -1
                                })
                              }
                            }}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 p-0"
                          >
                            <Minus size={14} />
                          </Button>
                          
                          <span className="min-w-[30px] text-center font-semibold">
                            {item.quantity}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateQuantityMutation.mutate({
                                productId: item.product.id,
                                quantity: 1
                              })
                            }}
                            className="w-8 h-8 p-0"
                          >
                            <Plus size={14} />
                          </Button>
                        </div>

                        <p className="text-sm font-semibold text-foreground">
                          ${(Number(item.product.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingBag size={64} className="text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Start adding some amazing products!</p>
            <Button onClick={() => router.push('/')} className="bg-black hover:bg-gray-800">
              Browse Products
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {cart && cart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="max-w-md mx-auto space-y-3">
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-foreground">Total:</span>
              <span className="text-2xl font-bold text-black">
                ${cart.total.toFixed(2)}
              </span>
            </div>

            {/* Checkout Button */}
            <Button
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3"
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  )
}
