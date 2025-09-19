"use client"

import { useState, useEffect } from "react"

export const dynamic = 'force-dynamic'
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Plus, Package, DollarSign, Eye, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import { ArtisanOnboardingGuard } from "@/components/artisan-onboarding-guard"
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
  const { data: session } = useSession()
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

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
      setSelectedFile(null)
      setImagePreview(null)
      setIsUploading(false)
      toast.success("Product created successfully!")
    },
    onError: (error: Error) => {
      setError(error.message)
      toast.error(error.message)
    }
  })


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Please select a valid image file")
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB")
        return
      }

      setSelectedFile(file)
      setError("")
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    
    // For now, we'll use a simple approach - convert to base64
    // In a real app, you'd upload to a service like Cloudinary, AWS S3, etc.
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.title || !formData.description || !formData.price) {
      setError("All fields are required")
      return
    }

    if (!selectedFile && !formData.imageUrl) {
      setError("Please upload an image or provide an image URL")
      return
    }

    if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      setError("Price must be a valid positive number")
      return
    }

    try {
      setIsUploading(true)
      
      // If a file is selected, upload it first
      if (selectedFile) {
        const imageUrl = await uploadImage(selectedFile)
        formData.imageUrl = imageUrl
      }

      createProductMutation.mutate(formData)
    } catch {
      setError("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const products = data?.products || []

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  // Check if user is an artisan
  if (session && session.user.role !== 'ARTISAN') {
    router.push('/')
    return null
  }

  return (
    <AuthGuard requireAuth={true}>
      <ArtisanOnboardingGuard>
        <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-foreground"
              >
                <ArrowLeft size={20} className="mr-2" />
                <span className="hidden sm:inline">Back to Feed</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Artisan Dashboard</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Welcome back, {session?.user.name}</p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-black hover:bg-gray-800 w-full sm:w-auto">
                  <Plus size={16} className="mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-lg sm:text-xl">Add New Product</DialogTitle>
                  <DialogDescription className="text-sm">
                    Create a new product to showcase in the video feed.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">Product Name</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter product name"
                      disabled={createProductMutation.isPending}
                      className="h-10 sm:h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your product..."
                      className="min-h-[100px] sm:min-h-[120px] resize-none"
                      disabled={createProductMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      disabled={createProductMutation.isPending}
                      className="h-10 sm:h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUpload" className="text-sm font-medium">Product Image</Label>
                    
                    {/* File Upload Input */}
                    <div className="relative">
                      <Input
                        id="imageUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={createProductMutation.isPending || isUploading}
                        className="h-10 sm:h-11 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                    </div>

                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mt-3">
                        <div className="relative w-full h-32 sm:h-40 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={imagePreview}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null)
                              setImagePreview(null)
                              setFormData({ ...formData, imageUrl: "" })
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected: {selectedFile?.name}
                        </p>
                      </div>
                    )}


                    <p className="text-xs text-muted-foreground">
                      Upload an image file (max 5MB)
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1 h-10 sm:h-11 order-2 sm:order-1"
                      disabled={createProductMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-black hover:bg-gray-800 h-10 sm:h-11 order-1 sm:order-2"
                      disabled={createProductMutation.isPending || isUploading}
                    >
                      {isUploading ? "Uploading..." : createProductMutation.isPending ? "Creating..." : "Create Product"}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Your Products</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading products...</div>
            </div>
          ) : fetchError ? (
            <div className="text-center py-8">
              <div className="text-red-500">Error loading products. Please try again.</div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <Package size={40} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No products yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">Create your first product to start showcasing your work!</p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-black hover:bg-gray-800 w-full sm:w-auto"
              >
                <Plus size={16} className="mr-2" />
                Add Your First Product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                    <CardContent className="p-3 sm:p-4">
                      <h3 className="font-semibold text-foreground mb-1 truncate text-sm sm:text-base">{product.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base sm:text-lg font-bold text-black">${product.price}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/product/${product.id}`)}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <Eye size={12} className="mr-1" />
                          <span className="hidden sm:inline">View</span>
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
      </ArtisanOnboardingGuard>
    </AuthGuard>
  )
}
