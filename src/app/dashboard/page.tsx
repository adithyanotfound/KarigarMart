"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Plus, Package, DollarSign, Eye, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import Image from "next/image"

interface Product {
  id: string
  title: string
  description: string
  price: number
  imageUrl: string
  videoUrl: string
  publishDate: string
}

async function fetchArtisanProducts() {
  const response = await fetch('/api/artisan/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    imageUrl: ""
  })
  const [error, setError] = useState("")

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['artisan-products'],
    queryFn: fetchArtisanProducts,
    enabled: !!session,
  })

  const createProductMutation = useMutation({
    mutationFn: async (productData: typeof formData) => {
      const response = await fetch('/api/artisan/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create product')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisan-products'] })
      setIsDialogOpen(false)
      setFormData({
        title: "",
        description: "",
        price: "",
        imageUrl: ""
      })
      setError("")
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.title || !formData.description || !formData.price || !formData.imageUrl) {
      setError("All fields are required")
      return
    }

    if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      setError("Price must be a valid positive number")
      return
    }

    createProductMutation.mutate(formData)
  }

  const products = data?.products || []

  // Check if user is an artisan
  if (session && session.user.role !== 'ARTISAN') {
    router.push('/')
    return null
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-foreground"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back to Feed
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Artisan Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {session.user.name}</p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-black hover:bg-gray-800">
                  <Plus size={16} className="mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>
                    Create a new product to showcase in the video feed.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="title">Product Name</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter product name"
                      disabled={createProductMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your product..."
                      className="min-h-[80px]"
                      disabled={createProductMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      disabled={createProductMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Product Image URL</Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      disabled={createProductMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload your image to a service like Imgur or use: https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/d2abc28d-2af7-4ef4-a956-c82f84484933.jpeg
                    </p>
                  </div>


                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                      disabled={createProductMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-black hover:bg-gray-800"
                      disabled={createProductMutation.isPending}
                    >
                      {createProductMutation.isPending ? "Creating..." : "Create Product"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${products.length > 0 
                  ? (products.reduce((sum: number, p: Product) => sum + Number(p.price), 0) / products.length).toFixed(2)
                  : '0.00'
                }
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${products.reduce((sum: number, p: Product) => sum + Number(p.price), 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products List */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Your Products</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading products...</div>
            </div>
          ) : fetchError ? (
            <div className="text-center py-8">
              <div className="text-red-500">Error loading products</div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No products yet</h3>
              <p className="text-muted-foreground mb-4">Create your first product to start showcasing your work!</p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-black hover:bg-gray-800"
              >
                <Plus size={16} className="mr-2" />
                Add Your First Product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: Product, index: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden">
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
                      <h3 className="font-semibold text-foreground mb-1 truncate">{product.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-black">${product.price}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/product/${product.id}`)}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Added {new Date(product.publishDate).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </AuthGuard>
  )
}
