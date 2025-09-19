"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AuthGuard } from "@/components/auth-guard"

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    story: ""
  })

  const totalSteps = 3


  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!formData.story.trim()) {
      setError("Please tell us your story")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch('/api/artisan/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story: formData.story
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to complete onboarding')
        return
      }

      // Move to success step
      setCurrentStep(totalSteps + 1)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const progressPercentage = (currentStep / totalSteps) * 100

  // Check if user is an artisan
  if (session && session.user.role !== 'ARTISAN') {
    router.push('/')
    return null
  }

  if (currentStep > totalSteps) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <CheckCircle size={80} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to ArtisanMarket!</h1>
            <p className="text-muted-foreground mb-4">Your profile has been created successfully.</p>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
          </motion.div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Complete Your Artisan Profile</CardTitle>
            <CardDescription>
              Step {currentStep} of {totalSteps}
            </CardDescription>
            <Progress value={progressPercentage} className="mt-4" />
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center space-y-4"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  Welcome, {session?.user.name}!
                </h3>
                <p className="text-muted-foreground">
                  We're excited to have you join our community of talented artisans. Let's set up your profile so customers can discover your amazing work.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">What you'll get:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>• Your own dashboard to manage products</li>
                    <li>• Video-first product showcase</li>
                    <li>• Direct connection with customers</li>
                    <li>• Secure payment processing</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Step 2: Basic Info */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  Confirm Your Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      This is how customers will see your name. Contact support if you need to change this.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Story */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  Tell Your Story
                </h3>
                <p className="text-muted-foreground">
                  Share your journey as an artisan. What inspired you to create? What makes your work special?
                </p>
                <div className="space-y-2">
                  <Label htmlFor="story">Your Artisan Journey</Label>
                  <Textarea
                    id="story"
                    value={formData.story}
                    onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                    placeholder="I've been crafting for... My inspiration comes from... What makes my work unique is..."
                    className="min-h-[120px]"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be displayed on your products to help customers connect with your work.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isLoading}
              >
                Back
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  className="bg-black hover:bg-gray-800"
                  disabled={isLoading}
                >
                  Next
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-black hover:bg-gray-800"
                  disabled={isLoading || !formData.story.trim()}
                >
                  {isLoading ? "Creating Profile..." : "Complete Setup"}
                </Button>
              )}
            </div>
        </CardContent>
      </Card>
      </motion.div>
      </div>
    </AuthGuard>
  )
}
