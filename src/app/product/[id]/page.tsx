"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { ArrowLeft, ShoppingCart, Heart, Plus, Minus, Play } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import Image from "next/image"

interface Product {
  id: string
  title: string
  description: string
  price: number
  imageUrl: string
  videoUrl: string
  artisan: {
    id: string
    story: string
    user: {
      name: string
    }
  }
}

async function fetchProduct(id: string): Promise<Product> {
  const response = await fetch(`/api/products/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch product')
  }
  return response.json()
}

// Enhanced Video Player Component
function EnhancedVideoPlayer({ videoUrl, title }: { videoUrl: string; title: string }) {
  return (
    <div className="bg-black rounded-lg overflow-hidden select-none video-container" style={{ height: '100%', minHeight: '400px' }}>
      <video 
        src={videoUrl} 
        controls 
        className="w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  )
}

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { addToCart, isAddingToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isLiked, setIsLiked] = useState(false)

  const productId = params.id as string

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
  })

  const handleAddToCart = () => {
    addToCart(productId, quantity)
  }

  const handleBuyNow = () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    // Add to cart first
    addToCart(productId, quantity)
    // Then redirect to payment
    const total = Number(product?.price || 0) * quantity
    router.push(`/payment?total=${total.toFixed(2)}`)
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    // In a real app, this would make an API call to save the like
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading product...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Product not found</div>
      </div>
    )
  }

  const total = Number(product.price) * quantity

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
          <h1 className="font-semibold text-foreground">Product Details</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={isLiked ? 'text-red-500' : 'text-foreground'}
          >
            <Heart size={20} className={isLiked ? 'fill-current' : ''} />
          </Button>
        </div>
      </div>

      <div className="pb-32">
        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Image */}
              <div>
                {/* Product Image */}
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-contain bg-white"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Right Column - Product Info */}
              <div className="space-y-6 mt-8">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-4">{product.title}</h1>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">{product.description}</p>
                  <Badge variant="secondary" className="bg-black text-white text-xl px-4 py-2">
                    ${product.price}
                  </Badge>
                </div>

                {/* Artisan Info */}
                {/* View Reel Button */}
                <Card>
                  <CardContent className="p-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-black hover:bg-gray-800 text-white">
                          <Play className="mr-2 h-4 w-4" />
                          View Product Reel
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[95vh] flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle>{product.title} - Product Reel</DialogTitle>
                        </DialogHeader>
                        <EnhancedVideoPlayer videoUrl={product.videoUrl} title={product.title} />
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-3 text-lg">About the Artisan</h3>
                    <p className="text-muted-foreground mb-3">
                      <strong className="text-foreground">{product.artisan.user.name}</strong>
                    </p>
                    <p className="text-foreground leading-relaxed">{product.artisan.story}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Product Image */}
          <div className="relative aspect-square bg-muted">
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-contain bg-white"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>

          {/* Product Info */}
          <div className="p-6 space-y-6 mt-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{product.title}</h1>
              <p className="text-muted-foreground mb-4">{product.description}</p>
              <Badge variant="secondary" className="bg-black text-white text-lg px-3 py-1">
                ${product.price}
              </Badge>
            </div>

            {/* View Reel Button */}
            <Card>
              <CardContent className="p-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-black hover:bg-gray-800 text-white">
                      <Play className="mr-2 h-4 w-4" />
                      View Product Reel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[85vh] sm:max-h-[95vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                      <DialogTitle>{product.title} - Product Reel</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                      <EnhancedVideoPlayer videoUrl={product.videoUrl} title={product.title} />
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Artisan Info */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2">About the Artisan</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>{product.artisan.user.name}</strong>
                </p>
                <p className="text-sm text-foreground">{product.artisan.story}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 md:hidden">
        <div className="max-w-md mx-auto space-y-3">
          {/* Quantity Selector */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus size={16} />
            </Button>
            <span className="font-semibold text-lg min-w-[60px] text-center">
              Qty: {quantity}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus size={16} />
            </Button>
          </div>

          {/* Total Price */}
          <div className="text-center">
            <span className="text-2xl font-bold text-foreground">
              Total: ${total.toFixed(2)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
            >
              {isAddingToCart ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart size={16} className="mr-2" />
                  Add to Cart
                </>
              )}
            </Button>
            <Button
              className="flex-1 bg-black hover:bg-gray-800"
              onClick={handleBuyNow}
              disabled={isAddingToCart}
            >
              Buy Now
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Action Bar */}
      <div className="hidden md:block bg-background border-t">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-lg font-medium text-foreground">Quantity:</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} />
                  </Button>
                  <span className="font-semibold text-xl min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              {/* Total Price */}
              <div className="text-right">
                <span className="text-3xl font-bold text-foreground">
                  Total: ${total.toFixed(2)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleAddToCart}
                  className="px-8"
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={20} className="mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  className="bg-black hover:bg-gray-800 px-8"
                  onClick={handleBuyNow}
                  disabled={isAddingToCart}
                >
                  Buy Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AuthGuard>
  )
}
