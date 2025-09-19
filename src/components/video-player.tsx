"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Volume2, VolumeX, ShoppingBag, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface Product {
  id: string
  title: string
  price: number
  videoUrl: string
  artisan: {
    user: {
      name: string
    }
  }
}

interface VideoPlayerProps {
  product: Product
  isActive: boolean
  onAddToCart: (productId: string) => void
  onLike: (productId: string) => void
}

export function VideoPlayer({ product, isActive, onAddToCart, onLike }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }, [isActive])

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    onLike(product.id)
  }

  const handleProductInfo = () => {
    router.push(`/product/${product.id}`)
  }

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={product.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      
      {/* Top controls */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          size="sm"
          variant="ghost"
          className="bg-black/20 backdrop-blur-sm text-white border-none"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </Button>
      </div>

      {/* Product info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-1">{product.title}</h3>
          <p className="text-sm opacity-90 mb-2">by {product.artisan.user.name}</p>
          <Badge variant="secondary" className="bg-[#d97757] text-white">
            ${product.price}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            size="sm"
            variant="outline"
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white"
            onClick={handleProductInfo}
          >
            View Details
          </Button>
          <Button 
            size="sm"
            className="bg-[#d97757] hover:bg-[#d97757]/90"
            onClick={() => onAddToCart(product.id)}
          >
            <ShoppingBag size={16} className="mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>

      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          className={`p-3 rounded-full backdrop-blur-sm ${
            isLiked ? 'bg-red-500' : 'bg-black/20'
          } transition-colors`}
        >
          <Heart 
            size={24} 
            className={`text-white ${isLiked ? 'fill-white' : ''}`} 
          />
        </motion.button>
      </div>

      {/* Swipe indicator */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/50 text-xs">
        Swipe up/down for more • Swipe right for product details
      </div>
    </div>
  )
}
