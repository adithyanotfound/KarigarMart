"use client"

import { useState, useEffect, useRef } from "react"
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion"
import { VideoPlayer } from "./video-player"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

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

export function VideoFeed() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const y = useMotionValue(0)
  const opacity = useTransform(y, [-100, 0, 100], [0.5, 1, 0.5])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  })

  const products = data?.pages.flatMap(page => page.products) || []

  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!session) {
        router.push('/auth/signin')
        return
      }
      
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity: 1 }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to add to cart')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  const likeMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!session) {
        router.push('/auth/signin')
        return
      }
      
      // This would typically hit a likes API endpoint
      console.log('Liked product:', productId)
    },
  })

  const handlePanEnd = (event: any, info: PanInfo) => {
    const threshold = 100
    const velocity = info.velocity.y

    if (info.offset.y > threshold || velocity > 500) {
      // Swipe down - previous video
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
        setDirection(-1)
      }
    } else if (info.offset.y < -threshold || velocity < -500) {
      // Swipe up - next video
      if (currentIndex < products.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setDirection(1)
        
        // Fetch more if near the end
        if (currentIndex >= products.length - 3 && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    } else if (info.offset.x > threshold || info.velocity.x > 500) {
      // Swipe right - go to product page
      if (products[currentIndex]) {
        router.push(`/product/${products[currentIndex].id}`)
      }
    }

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
        dragConstraints={{ top: -50, bottom: 50 }}
        dragElastic={0.1}
        onPanEnd={handlePanEnd}
      >
        {products.map((product, index) => (
          <motion.div
            key={product.id}
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
              stiffness: 300,
              damping: 30
            }}
          >
            {Math.abs(index - currentIndex) <= 1 && (
              <VideoPlayer
                product={product}
                isActive={index === currentIndex}
                onAddToCart={(productId) => addToCartMutation.mutate(productId)}
                onLike={(productId) => likeMutation.mutate(productId)}
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
