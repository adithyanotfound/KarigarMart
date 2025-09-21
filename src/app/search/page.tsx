"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Search, ArrowLeft, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import Image from "next/image"
import Link from "next/link"

interface Product {
  id: string
  title: string
  description: string
  price: number
  imageUrl: string
  videoUrl: string
  publishDate: string
  artisan: {
    user: {
      name: string
    }
  }
}

async function searchProducts(query: string) {
  const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
  if (!response.ok) {
    throw new Error('Failed to search products')
  }
  return response.json()
}

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(query)

  const { data, isLoading, error } = useQuery({
    queryKey: ['search-products', query],
    queryFn: () => searchProducts(query),
    enabled: !!query.trim(),
  })

  const products = data?.products || []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <div className="pt-16 pb-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-foreground"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Search Results</h1>
              <p className="text-muted-foreground">
                {query ? `Results for "${query}"` : 'Enter a search term to find products'}
              </p>
            </div>
          </div>

          {/* Search Stats */}
          {query && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search size={16} />
              <span>
                {isLoading ? 'Searching...' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 pb-8">
        {!query ? (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Search Products</h2>
            <p className="text-muted-foreground">Use the search bar above to find products</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching for products...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">Error searching products</div>
            <p className="text-muted-foreground">Please try again later</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No products found</h2>
            <p className="text-muted-foreground mb-4">
              No products match your search for "{query}"
            </p>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: Product, index: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/product/${product.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="relative aspect-square">
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                        {product.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-foreground">
                          ${product.price}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          by {product.artisan.user.name}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading search...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
