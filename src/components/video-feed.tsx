"use client"

import { useState, useEffect, useRef } from "react"
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion"
import { VideoPlayer } from "./video-player"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCart } from "@/hooks/use-cart"


async function fetchProducts({ pageParam }: { pageParam?: string }) {
  const url = pageParam 
    ? `/api/products?cursor=${pageParam}&limit=5`
    : `/api/products?limit=5`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

interface VideoFeedProps {
  onPauseChange?: (isPaused: boolean) => void
}

export function VideoFeed({ onPauseChange }: VideoFeedProps = {}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [currentVideoPaused, setCurrentVideoPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { data: session } = useSession()
  const { addToCart } = useCart()

  const y = useMotionValue(0)
  const opacity = useTransform(y, [-100, 0, 100], [0.5, 1, 0.5])

  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    getNextPageParam: (lastPage) => lastPage.nextCursor, // Always has next page due to cycling
    initialPageParam: undefined,
  })

  const products = data?.pages.flatMap(page => page.products) || []

  const handleAddToCart = (productId: string) => {
    addToCart(productId, 1)
  }

  const handleLike = (productId: string) => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    // This would typically hit a likes API endpoint
    console.log('Liked product:', productId)
  }

  const handlePanEnd = (_event: unknown, info: PanInfo) => {
    const minSwipeDistance = 20 // Minimum distance to register a swipe
    const velocity = info.velocity.y
    const velocityThreshold = 200 // Velocity threshold for quick swipes
    

    // Check if it's a vertical swipe (up or down)
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      // Vertical swipe detected
      if (info.offset.y > minSwipeDistance || velocity > velocityThreshold) {
        // Swipe down - previous video
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1)
          setDirection(-1)
        }
      } else if (info.offset.y < -minSwipeDistance || velocity < -velocityThreshold) {
        // Swipe up - next video
        if (currentIndex < products.length - 1) {
          setCurrentIndex(currentIndex + 1)
          setDirection(1)
          
          // Always fetch more content to ensure infinite scroll
          if (currentIndex >= products.length - 3 && !isFetchingNextPage) {
            fetchNextPage()
          }
        }
      }
    } else if (info.offset.x > minSwipeDistance || info.velocity.x > velocityThreshold) {
      // Swipe right - go to product page
      if (products[currentIndex]) {
        router.push(`/product/${products[currentIndex].id}`)
      }
    }

    // Always snap back to center with smooth animation
    y.stop()
    y.set(0)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
        setDirection(-1)
      } else if (event.key === 'ArrowDown' && currentIndex < products.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setDirection(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, products.length])

  // Handle scroll navigation
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout
    let lastScrollY = 0
    let isScrolling = false

    const handleScroll = (event: WheelEvent) => {
      // Prevent default scroll behavior
      event.preventDefault()
      
      // Clear existing timeout
      clearTimeout(scrollTimeout)
      
      // If already scrolling, ignore this event
      if (isScrolling) return
      
      const deltaY = event.deltaY
      const currentScrollY = window.scrollY
      
      // Determine scroll direction
      const isScrollingDown = deltaY > 0 || currentScrollY > lastScrollY
      const isScrollingUp = deltaY < 0 || currentScrollY < lastScrollY
      
      lastScrollY = currentScrollY
      
      // Set scrolling flag to prevent multiple rapid changes
      isScrolling = true
      
      if (isScrollingDown && currentIndex < products.length - 1) {
        // Scroll down - next video
        setCurrentIndex(currentIndex + 1)
        setDirection(1)
        
        // Always fetch more content to ensure infinite scroll
        if (currentIndex >= products.length - 3 && !isFetchingNextPage) {
          fetchNextPage()
        }
      } else if (isScrollingUp && currentIndex > 0) {
        // Scroll up - previous video
        setCurrentIndex(currentIndex - 1)
        setDirection(-1)
      }
      
      // Reset scrolling flag after a short delay
      scrollTimeout = setTimeout(() => {
        isScrolling = false
      }, 150)
    }

    // Add scroll event listener with passive: false to allow preventDefault
    window.addEventListener('wheel', handleScroll, { passive: false })
    
    return () => {
      window.removeEventListener('wheel', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [currentIndex, products.length, isFetchingNextPage, fetchNextPage])

  // Notify parent when current video pause state changes
  useEffect(() => {
    onPauseChange?.(currentVideoPaused)
  }, [currentVideoPaused, onPauseChange])

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading videos...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Error loading videos</div>
      </div>
    )
  }

  if (!products.length) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">No videos available</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-screen overflow-hidden bg-black">
      <motion.div
        className="absolute inset-0"
        style={{ y, opacity }}
        drag="y"
        dragConstraints={{ top: -100, bottom: 100 }}
        dragElastic={0.2}
        dragMomentum={false}
        onPanEnd={handlePanEnd}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 40
        }}
      >
        {products.map((product, index) => (
          <motion.div
            key={`${product.id}-${index}`}
            className="absolute inset-0"
            initial={{
              y: index === 0 ? 0 : direction > 0 ? "100%" : "-100%",
              opacity: index === 0 ? 1 : 0
            }}
            animate={{
              y: index === currentIndex ? 0 : 
                 index < currentIndex ? "-100%" : "100%",
              opacity: index === currentIndex ? 1 : 0
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
              mass: 1
            }}
          >
            {Math.abs(index - currentIndex) <= 1 && (
              <VideoPlayer
                product={product}
                isActive={index === currentIndex}
                onAddToCart={handleAddToCart}
                onLike={handleLike}
                onPauseChange={index === currentIndex ? setCurrentVideoPaused : undefined}
              />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Progress indicator */}
      <div className="absolute top-4 left-4 right-16 z-10">
        <div className="flex gap-1">
          {products.slice(0, 10).map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded ${
                index === currentIndex ? 'bg-white' : 'bg-white/30'
              } transition-colors`}
            />
          ))}
        </div>
      </div>

      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
          Loading more videos...
        </div>
      )}
    </div>
  )
}
