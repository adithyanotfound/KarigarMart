"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Plus, Package, DollarSign, Eye, ArrowLeft, Mic, Play, Square, Trash2, RotateCcw, CheckCircle } from "lucide-react"
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
  })
  const [error, setError] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // Voice input state
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [useVoiceInput, setUseVoiceInput] = useState(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingStartTime = useRef<number | null>(null)

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['artisan-products'],
    queryFn: fetchArtisanProducts,
    enabled: !!session,
  })

  const createProductMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; price: string; image: File }) => {
      // Create FormData object
      const formDataToSend = new FormData()
      formDataToSend.append('title', data.title.trim())
      formDataToSend.append('description', data.description.trim())
      formDataToSend.append('price', data.price.trim())
      formDataToSend.append('image', data.image) // Note: 'image' not 'file'

      const response = await fetch('/api/artisan/products', {
        method: 'POST',
        body: formDataToSend, // Don't set Content-Type header - let browser set it
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create product')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisan-products'] })
      handleCloseDialog()
      toast.success("Product created successfully!")
    },
    onError: (error: Error) => {
      setError(error.message)
      toast.error(error.message)
      console.error('Create product error:', error)
    }
  })

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setFormData({
      title: "",
      description: "",
      price: "",
    })
    setError("")
    setSelectedFile(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
    setIsUploading(false)
    
    // Reset voice input state
    setUseVoiceInput(false)
    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setRecordingDuration(0)
    setIsRecording(false)
    setIsPlaying(false)
  }

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
      
      // Clean up previous preview URL
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
      
      // Create new preview URL
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
    }
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const audioChunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        setAudioBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
        toast.success("Recording completed!")
      }

      mediaRecorder.start()
      setIsRecording(true)
      recordingStartTime.current = Date.now()
      setRecordingDuration(0)
      toast.info("Recording started...")
    } catch (error) {
      toast.error("Could not access microphone. Please check permissions.")
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingStartTime.current) {
        const duration = Math.round((Date.now() - recordingStartTime.current) / 1000)
        setRecordingDuration(duration)
      }
    }
  }

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const deleteAudio = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingDuration(0)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    toast.success("Audio recording deleted")
  }

  const reRecordAudio = () => {
    deleteAudio()
    toast.info("Ready to record again. Click 'Start Recording' when ready.")
  }

  const processAudioToText = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.wav')

    const response = await fetch('/api/tts', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to transcribe audio')
    }

    const data = await response.json()
    return data.transcription
  }

  const generateSummary = async (text: string): Promise<string> => {
    const response = await fetch('/api/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate summary')
    }

    const data = await response.json()
    return data.summary
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.title.trim()) {
      setError("Product name is required")
      return
    }

    if (!formData.description.trim() && !audioBlob) {
      setError("Description is required or record a voice description")
      return
    }

    if (!formData.price.trim()) {
      setError("Price is required")
      return
    }

    if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      setError("Price must be a valid positive number")
      return
    }

    if (!selectedFile) {
      setError("Please select an image file")
      return
    }

    try {
      setIsUploading(true)
      
      let finalDescription = formData.description

      // Process voice input if available
      if (audioBlob) {
        toast.info("Processing voice description...")
        try {
          const transcription = await processAudioToText(audioBlob)
          if (transcription.trim()) {
            // Use audio transcription as the description
            finalDescription = transcription
            toast.success("Voice description transcribed successfully!")
            
            // Enhance description using summary endpoint
            try {
              toast.info("Enhancing description...")
              const enhancedDescription = await generateSummary(finalDescription)
              if (enhancedDescription.trim()) {
                finalDescription = enhancedDescription
                toast.success("Description enhanced successfully!")
              }
            } catch (summaryError) {
              console.error('Summary generation error:', summaryError)
              toast.error("Failed to enhance description. Using original transcription.")
            }
          } else {
            // If transcription is empty, fall back to text input
            if (formData.description.trim()) {
              finalDescription = formData.description
              toast.info("No speech detected in voice input. Using text description.")
            }
          }
        } catch (audioError) {
          console.error('Voice processing error:', audioError)
          toast.error("Failed to process voice input. Using text description instead.")
          // Continue with text input if audio processing fails
          if (formData.description.trim()) {
            finalDescription = formData.description
          }
        }
      } else if (formData.description.trim()) {
        // Enhance text description if no voice input
        try {
          toast.info("Enhancing description...")
          const enhancedDescription = await generateSummary(formData.description)
          if (enhancedDescription.trim()) {
            finalDescription = enhancedDescription
            toast.success("Description enhanced successfully!")
          }
        } catch (summaryError) {
          console.error('Summary generation error:', summaryError)
          toast.error("Failed to enhance description. Using original text.")
        }
      }
      
      // Submit with FormData
      createProductMutation.mutate({
        title: formData.title,
        description: finalDescription,
        price: formData.price,
        image: selectedFile
      })
    } catch (err) {
      console.error('Submit error:', err)
      setError("Failed to create product. Please try again.")
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
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [imagePreview, audioUrl])

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
                    
                    {/* Input Method Selection */}
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-gray-600 mb-2">Choose input method:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={!useVoiceInput ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUseVoiceInput(false)}
                          disabled={createProductMutation.isPending}
                          className={`flex items-center gap-2 h-10 ${
                            !useVoiceInput 
                              ? "bg-black hover:bg-gray-800 text-white" 
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Text Input
                        </Button>
                        <Button
                          type="button"
                          variant={useVoiceInput ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUseVoiceInput(true)}
                          disabled={createProductMutation.isPending}
                          className={`flex items-center gap-2 h-10 ${
                            useVoiceInput 
                              ? "bg-black hover:bg-gray-800 text-white" 
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <Mic size={16} />
                          Voice Input
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        {useVoiceInput ? "Record your product description" : "Type your product description"}
                      </div>
                    </div>

                    {useVoiceInput ? (
                      <div className="space-y-3">
                        {/* Voice Recording Controls */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          {!isRecording ? (
                            <Button
                              type="button"
                              variant={audioBlob ? "secondary" : "outline"}
                              onClick={startRecording}
                              disabled={createProductMutation.isPending}
                              className={`flex items-center gap-2 ${audioBlob ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : ""}`}
                            >
                              <Mic size={16} />
                              {audioBlob ? "Record Again" : "Start Recording"}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={stopRecording}
                              disabled={createProductMutation.isPending}
                              className="flex items-center gap-2"
                            >
                              <Square size={16} />
                              Stop Recording
                            </Button>
                          )}
                          
                          {audioUrl && (
                            <div className="flex items-center gap-2">
                              {!isPlaying ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={playAudio}
                                  disabled={createProductMutation.isPending}
                                  className="flex items-center gap-2"
                                >
                                  <Play size={14} />
                                  Play
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={stopAudio}
                                  disabled={createProductMutation.isPending}
                                  className="flex items-center gap-2"
                                >
                                  <Square size={14} />
                                  Stop
                                </Button>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {isRecording ? "Recording..." : `Audio recorded (${recordingDuration}s)`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Audio Management Controls */}
                        {audioUrl && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
                              <CheckCircle size={16} />
                              <span>Voice description recorded ({recordingDuration}s)</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={reRecordAudio}
                                disabled={createProductMutation.isPending || isRecording}
                                className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <RotateCcw size={14} />
                                Re-record
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={deleteAudio}
                                disabled={createProductMutation.isPending || isRecording}
                                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {audioUrl && (
                          <audio
                            ref={audioRef}
                            src={audioUrl}
                            onEnded={handleAudioEnded}
                            className="hidden"
                          />
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          Voice input will be automatically transcribed and enhanced for better product descriptions.
                        </p>
                      </div>
                    ) : (
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe your product..."
                        className="min-h-[100px] sm:min-h-[120px] resize-none"
                        disabled={createProductMutation.isPending}
                      />
                    )}
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
                      onClick={handleCloseDialog}
                      className="flex-1 h-10 sm:h-11 order-2 sm:order-1"
                      disabled={createProductMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-black hover:bg-gray-800 h-10 sm:h-11 order-1 sm:order-2"
                      disabled={createProductMutation.isPending || isUploading || !selectedFile}
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