"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Volume2, VolumeX, ShoppingBag, Heart, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useVideoSettings } from "@/hooks/use-video-settings"

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
  onPauseChange?: (isPaused: boolean) => void
}

export function VideoPlayer({ product, isActive, onAddToCart, onLike, onPauseChange }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isMuted, setIsMuted, hasUserInteracted, setHasUserInteracted } = useVideoSettings()
  const [isPaused, setIsPaused] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [showPlayPauseButton, setShowPlayPauseButton] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (videoRef.current) {
      // Apply mute setting
      videoRef.current.muted = isMuted

      if (isActive && !isPaused && hasUserInteracted) {
        // Only try to play if user has interacted with the page
        videoRef.current.play().catch((error) => {
          console.warn('Video play failed:', error)
          // If play fails, show the play button
          setShowPlayPauseButton(true)
        })
      } else if (isActive && !isPaused && !hasUserInteracted) {
        // If no user interaction yet, show play button
        setShowPlayPauseButton(true)
      } else {
        videoRef.current.pause()
      }
    }
  }, [isActive, isPaused, isMuted, hasUserInteracted])

  // Reset pause state and show play/pause button when video becomes active
  useEffect(() => {
    if (isActive) {
      setIsPaused(false)
      // Always show button initially, hide after delay only if user has interacted
      setShowPlayPauseButton(true)
      if (hasUserInteracted) {
        // Hide button after 2 seconds only if user has interacted
        setTimeout(() => {
          setShowPlayPauseButton(false)
        }, 2000)
      }
    }
  }, [isActive, hasUserInteracted])

  // Notify parent component when pause state changes
  useEffect(() => {
    onPauseChange?.(isPaused)
  }, [isPaused, onPauseChange])

  const handlePlayPause = () => {
    // Mark user as having interacted
    setHasUserInteracted(true)

    setIsPaused(!isPaused)
    // Show button temporarily as visual feedback
    setShowPlayPauseButton(true)
    setTimeout(() => {
      setShowPlayPauseButton(false)
    }, 1000) // Hide after 1 second
  }

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering play/pause
    setIsMuted(!isMuted)
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering play/pause
    setIsLiked(!isLiked)
    onLike(product.id)
  }

  const handleProductInfo = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering play/pause
    router.push(`/product/${product.id}`)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering play/pause
    onAddToCart(product.id)
  }


  return (
    <div
      className="relative h-screen w-full bg-black overflow-hidden"
      onClick={handlePlayPause}
    >
      <video
        ref={videoRef}
        src={product.videoUrl}
        className="absolute inset-0 w-full h-full object-contain"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

      {/* Center play/pause button - only show when showPlayPauseButton is true */}
      {showPlayPauseButton && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
        >
          <div className="p-4 rounded-full bg-black/50 backdrop-blur-sm">
            {isPaused ? (
              <Play size={48} className="text-white" />
            ) : (
              <Pause size={48} className="text-white" />
            )}
          </div>
        </motion.div>
      )}

      {/* Mute/unmute button - top right corner below navbar */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleMuteToggle}
        className="absolute top-20 right-4 z-30 p-2 rounded-full bg-black/50 backdrop-blur-sm"
      >
        {isMuted ? (
          <VolumeX size={24} className="text-white" />
        ) : (
          <Volume2 size={24} className="text-white" />
        )}
      </motion.button>

      {/* Product info overlay - hidden when paused */}
      {!isPaused && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isPaused ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-0 left-0 right-0 p-6 text-white"
        >
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-1">{product.title}</h3>
            <p className="text-sm opacity-90 mb-2">by {product.artisan.user.name}</p>
            <Badge variant="secondary" className="bg-black text-white">
              ${product.price}
            </Badge>
          </div>

          {/* Small cart text */}
          <p className="text-xs text-white/60 mb-3">
            The video is for reference only. Please refer to the image for the actual product.
          </p>

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
              className="bg-black hover:bg-gray-800"
              onClick={handleAddToCart}
            >
              <ShoppingBag size={16} className="mr-2" />
              Add to Cart
            </Button>
          </div>
        </motion.div>
      )}

      {/* Like button - hidden when paused */}
      {!isPaused && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isPaused ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          className="absolute right-4 bottom-32 flex flex-col gap-4"
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
            className={`p-3 rounded-full backdrop-blur-sm ${isLiked ? 'bg-red-500' : 'bg-black/20'
              } transition-colors`}
          >
            <Heart
              size={24}
              className={`text-white ${isLiked ? 'fill-white' : ''}`}
            />
          </motion.button>
        </motion.div>
      )}

      {/* Swipe indicator - hidden when paused */}
      {!isPaused && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isPaused ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/50 text-xs"
        >

        </motion.div>
      )}
    </div>
  )
}
