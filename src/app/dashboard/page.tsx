"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Plus, Package, DollarSign, Eye, ArrowLeft, Image as ImageIcon, Sparkles, TrendingUp, CalendarDays, ShoppingBag, Download, Play } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import { ArtisanOnboardingGuard } from "@/components/artisan-onboarding-guard"
import { useLanguage } from "@/contexts/language-context"
import Image from "next/image"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts"
import ProductStatsDialog from "@/components/product-stats-dialog";

interface Product {
  id: string
  title: string
  description: string
  price: number
  imageUrl: string
  videoUrl: string
  publishDate: string
}

interface Stats {
  totalSales: number;
  salesThisMonth: number;
  pastOrders: any[]; // Define more specific types if needed
  productStats: {
    id: string;
    title: string;
    totalQuantitySold: number;
    totalRevenue: number;
  }[];
}

async function fetchArtisanStats() {
  const response = await fetch('/api/artisan/stats')
  if (!response.ok) {
    throw new Error('Failed to fetch stats')
  }
  return response.json()
}

async function fetchArtisanProducts() {
  const response = await fetch('/api/artisan/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
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

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    price: "",
  })
  const [error, setError] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showExitWarning, setShowExitWarning] = useState(false)

  const { data: stats, isLoading: isLoadingStats } = useQuery<Stats>({
    queryKey: ['artisan-stats'],
    queryFn: fetchArtisanStats,
    enabled: !!session,
  })

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['artisan-products'],
    queryFn: fetchArtisanProducts,
    enabled: !!session,
  })

  const createProductMutation = useMutation({
    mutationFn: async (data: { title: string; price: string; image: File }) => {
      const formDataToSend = new FormData()
      formDataToSend.append('title', data.title.trim())
      formDataToSend.append('price', data.price.trim())
      formDataToSend.append('image', data.image)

      const response = await fetch('/api/artisan/products', {
        method: 'POST',
        body: formDataToSend,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create product')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisan-products'] })
      queryClient.invalidateQueries({ queryKey: ['artisan-stats'] })
      setIsUploading(false)
      setShowExitWarning(false)
      handleCloseDialog(true)
      toast.success(t("common.success"))
    },
    onError: (error: Error) => {
      setError(error.message)
      setIsUploading(false)
      setShowExitWarning(false)
      toast.error(error.message)
      console.error('Create product error:', error)
    }
  })

  const handleCloseDialog = (force: boolean = false) => {
    if ((createProductMutation.isPending || isUploading) && !force) {
      return
    }
    
    setIsDialogOpen(false)
    setFormData({ title: "", price: "" })
    setError("")
    setSelectedFile(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
    setIsUploading(false)
    setShowExitWarning(false)
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (createProductMutation.isPending || isUploading) {
        setShowExitWarning(true)
        setIsDialogOpen(true)
        return
      }
      handleCloseDialog()
      return
    }
    setIsDialogOpen(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError(t("common.error"))
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(t("common.error"))
        return
      }
      setSelectedFile(file)
      setError("")
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.title.trim() || !formData.price.trim() || isNaN(Number(formData.price)) || Number(formData.price) <= 0 || !selectedFile) {
      setError(t("common.error"))
      return
    }

    setIsUploading(true)
    setShowExitWarning(true)
    
    createProductMutation.mutate({
      title: formData.title,
      price: formData.price,
      image: selectedFile
    })
  }

  const products = data?.products || []

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (showExitWarning) {
        e.preventDefault()
        e.returnValue = t("dashboard.dontCloseWindow")
        return e.returnValue
      }
    }
    if (showExitWarning) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [showExitWarning, t])

  if (session && session.user.role !== 'ARTISAN') {
    router.push('/')
    return null
  }

  const top10Products = stats?.productStats
    ?.sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
    
  const monthlySalesData = useMemo(() => {
      if (!stats?.pastOrders) return [];

      const monthLabels: {key: string, name: string}[] = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
          const monthName = d.toLocaleString('default', { month: 'short' });
          monthLabels.push({key: monthKey, name: monthName});
      }

      const monthlySales = new Map<string, number>();
      monthLabels.forEach(m => monthlySales.set(m.key, 0));

      stats.pastOrders.forEach(order => {
          const orderDate = new Date(order.createdAt);
          const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth()}`;
          if (monthlySales.has(monthKey)) {
              const currentSales = monthlySales.get(monthKey) || 0;
              const orderTotal = order.orderItems.reduce((sum: number, item: any) => sum + Number(item.price) * item.quantity, 0);
              monthlySales.set(monthKey, currentSales + orderTotal);
          }
      });

      return monthLabels.map(m => ({
          name: m.name,
          total: monthlySales.get(m.key) || 0,
      }));
  }, [stats?.pastOrders]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
          <p className="font-bold">{label}</p>
          <p className="text-sm">{t("dashboard.totalSalesTooltip")}: ${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };
  
  const truncateText = (text: string, length: number) => {
    if (text.length <= length) {
      return text;
    }
    return `${text.substring(0, length)}...`;
  };

  const handleDownloadReel = (videoUrl: string, title: string) => {
    fetch(videoUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(t("dashboard.downloadStarted") || "Download started");
      })
      .catch(error => {
        console.error('Download error:', error);
        toast.error(t("dashboard.downloadFailed") || "Download failed");
      });
  };

  return (
    <AuthGuard requireAuth={true}>
      <ArtisanOnboardingGuard>
        <div className="min-h-screen bg-background">
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
                    <span className="hidden sm:inline">{t("dashboard.backToFeed")}</span>
                    <span className="sm:hidden">{t("dashboard.back")}</span>
                  </Button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t("dashboard.artisanDashboard")}</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">{t("dashboard.welcomeBack")}, {session?.user.name}</p>
                  </div>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Button className="bg-black hover:bg-gray-800 w-full sm:w-auto">
                      <Plus size={16} className="mr-2" />
                      {t("dashboard.addProduct")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
                  <DialogHeader className="space-y-2">
                   <DialogTitle className="text-lg sm:text-xl">{t("dashboard.addNewProduct")}</DialogTitle>
                   <DialogDescription className="text-sm">
                     {t("dashboard.createNewProduct")}
                   </DialogDescription>
                 </DialogHeader>
                 <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                   {error && (
                     <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                       {error}
                     </div>
                   )}

                   <div className="space-y-2">
                     <Label htmlFor="title" className="text-sm font-medium">{t("dashboard.productName")}</Label>
                     <Input
                       id="title"
                       value={formData.title}
                       onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                       placeholder={t("dashboard.enterProductName")}
                       disabled={createProductMutation.isPending}
                       className="h-10 sm:h-11"
                     />
                   </div>

                   <div className="space-y-2">
                     <Label className="text-sm font-medium">{t("dashboard.aiGeneratedContent")}</Label>
                     <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                       <Sparkles size={16} />
                       <span>{t("dashboard.aiWillGenerate")}</span>
                     </div>
                     <p className="text-xs text-muted-foreground">
                       {t("dashboard.aiDescription")}
                     </p>
                   </div>

                   <div className="space-y-2">
                     <Label htmlFor="price" className="text-sm font-medium">{t("dashboard.price")}</Label>
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
                     <Label htmlFor="imageUpload" className="text-sm font-medium">{t("dashboard.productImage")}</Label>
                     
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
                               if (imagePreview) {
                                 URL.revokeObjectURL(imagePreview)
                               }
                               setImagePreview(null)
                             }}
                             className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                           >
                             ×
                           </button>
                         </div>
                         <p className="text-xs text-muted-foreground mt-1">
                           {t("dashboard.selected")}: {selectedFile?.name}
                         </p>
                       </div>
                     )}

                     <p className="text-xs text-muted-foreground">
                       {t("dashboard.uploadImageFile")}
                     </p>
                   </div>

                   {(createProductMutation.isPending || isUploading) && (
                     <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
                       <div className="flex items-center gap-3">
                         <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                         <div>
                           <p className="text-black font-medium">{t("dashboard.creatingProduct")}</p>
                           <p className="text-gray-600 text-sm mt-1">
                             {t("dashboard.processTakesMinute")}
                           </p>
                         </div>
                       </div>
                     </div>
                   )}

                   {showExitWarning && (
                     <div className="bg-gray-100 border border-gray-400 rounded-lg p-4 mb-4">
                       <div className="flex items-center gap-3">
                         <div className="text-black">⚠️</div>
                         <div>
                           <p className="text-black font-medium">{t("dashboard.dontCloseWindow")}</p>
                           <p className="text-gray-600 text-sm mt-1">
                             {t("dashboard.productBeingCreated")}
                           </p>
                         </div>
                       </div>
                     </div>
                   )}

                   <div className="flex flex-col sm:flex-row gap-3 pt-4">
                     <Button
                       type="button"
                       variant="outline"
                       onClick={() => handleCloseDialog()}
                       className="flex-1 h-10 sm:h-11 order-2 sm:order-1"
                       disabled={createProductMutation.isPending || isUploading}
                     >
                       {t("dashboard.cancel")}
                     </Button>
                     <Button
                       type="submit"
                       className="flex-1 bg-black hover:bg-gray-800 h-10 sm:h-11 order-1 sm:order-2"
                       disabled={createProductMutation.isPending || isUploading || !selectedFile}
                     >
                       {isUploading ? t("dashboard.uploading") : createProductMutation.isPending ? t("dashboard.creating") : t("dashboard.createProduct")}
                     </Button>
                   </div>
                 </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("dashboard.totalSales")}</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(stats?.totalSales ?? 0).toFixed(2)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("dashboard.salesThisMonth")}</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(stats?.salesThisMonth ?? 0).toFixed(2)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("dashboard.totalProducts")}</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.length}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.monthlySales")}</CardTitle>
                  <CardDescription>{t("dashboard.salesPerformance")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlySalesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" fill="#000000" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.productsByRevenue")}</CardTitle>
                  <CardDescription>{t("dashboard.productSalesPerformance")}</CardDescription>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={top10Products}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="title" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        tickFormatter={(tick) => truncateText(tick, 15)}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="totalRevenue" stroke="#000000" activeDot={{ r: 8 }} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">{t("dashboard.yourProducts")}</h2>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">{t("dashboard.loadingProducts")}</div>
                </div>
              ) : fetchError ? (
                <div className="text-center py-8">
                  <div className="text-red-500">{t("dashboard.errorLoadingProducts")}</div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <Package size={40} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{t("dashboard.noProductsYet")}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">{t("dashboard.createFirstProduct")}</p>
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-black hover:bg-gray-800 w-full sm:w-auto"
                  >
                    <Plus size={16} className="mr-2" />
                    {t("dashboard.addFirstProduct")}
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
                            <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(`/product/${product.id}`)}
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  <Eye size={12} className="mr-1" />
                                  <span className="hidden sm:inline">{t("dashboard.view")}</span>
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs sm:text-sm px-2 sm:px-3"
                                    >
                                      <Play size={12} className="mr-1" />
                                      <span className="hidden sm:inline">Reel</span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] flex flex-col">
                                    <DialogHeader className="flex-shrink-0 pb-4">
                                      <DialogTitle>{product.title} - Product Reel</DialogTitle>
                                    </DialogHeader>
                                    <EnhancedVideoPlayer videoUrl={product.videoUrl} title={product.title} />
                                    <div className="flex justify-end pt-4 flex-shrink-0">
                                      <Button
                                        onClick={() => handleDownloadReel(product.videoUrl, product.title)}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                      >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Reel
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                {(
                                  <ProductStatsDialog productStats={stats?.productStats?.find(p => p.id === product.id)} />
                                )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {t("dashboard.added")} {new Date(product.publishDate).toLocaleDateString()}
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