"use client"

import { useState, Suspense } from "react"

export const dynamic = 'force-dynamic'
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CreditCard, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthGuard } from "@/components/auth-guard"

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const total = searchParams.get('total') || '0.00'


  const handlePayment = async () => {
    setIsProcessing(true)
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsProcessing(false)
    setIsSuccess(true)
    
    // After 2 seconds, redirect to home
    setTimeout(() => {
      router.push('/')
    }, 2000)
  }

  if (isSuccess) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <CheckCircle size={80} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-4">Thank you for your purchase.</p>
            <p className="text-sm text-muted-foreground">Redirecting to home...</p>
          </motion.div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-foreground"
            disabled={isProcessing}
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </Button>
          <h1 className="font-semibold text-foreground">Payment</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="text-2xl font-bold text-black">${total}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard size={20} />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                disabled={isProcessing}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  disabled={isProcessing}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Cardholder Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                disabled={isProcessing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                disabled={isProcessing}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="New York"
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="10001"
                  disabled={isProcessing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Button
          className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3"
          onClick={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing Payment...
            </div>
          ) : (
            `Confirm Payment - $${total}`
          )}
        </Button>

        {/* Security Notice */}
        <div className="text-center text-sm text-muted-foreground">
          <p>🔒 Your payment information is secure and encrypted.</p>
          <p className="mt-1 text-xs">This is a demo payment page. No real charges will be made.</p>
        </div>
      </div>
      </div>
    </AuthGuard>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentContent />
    </Suspense>
  )
}
