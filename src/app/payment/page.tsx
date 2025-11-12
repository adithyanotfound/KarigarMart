"use client"

import { useState, Suspense, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CreditCard, CheckCircle, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import { clearCartCache } from "@/hooks/use-cart"

declare global {
  interface Window {
    Razorpay: any
  }
}

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { update } = useSession()
  const queryClient = useQueryClient()
  const [isSuccess, setIsSuccess] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)

  const total = searchParams.get('total') || '0.00'
  const totalNumber = parseFloat(total)
  const paymentType = searchParams.get('type') || 'cart'

  // Check if Razorpay script is loaded
  useEffect(() => {
    const checkRazorpay = () => {
      if (window.Razorpay) {
        setRazorpayLoaded(true)
      } else {
        setTimeout(checkRazorpay, 100)
      }
    }
    checkRazorpay()
  }, [])

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      toast.error('Payment gateway is still loading. Please wait...')
      return
    }

    if (totalNumber <= 0) {
      toast.error('Invalid payment amount')
      return
    }

    setIsProcessing(true)

    try {
      // Create Razorpay order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalNumber,
          currency: 'USD',
          paymentType: paymentType,
        }),
      })

      // Check if response is JSON
      const contentType = orderResponse.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await orderResponse.text()
        console.error('Non-JSON response received:', text.substring(0, 500))
        
        // Check if it's an HTML error page
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          toast.error('Server configuration error. Please check your Razorpay API keys in .env file and restart the server.')
          throw new Error('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file and restart the server.')
        }
        
        throw new Error('Server returned an unexpected response. Please check server logs.')
      }

      if (!orderResponse.ok) {
        try {
          const error = await orderResponse.json()
          const errorMessage = error.error || 'Failed to create payment order'
          
          // Provide helpful error messages
          if (errorMessage.includes('Razorpay credentials')) {
            toast.error('Razorpay is not configured. Please add your API keys to .env file and restart the server.')
          } else {
            toast.error(errorMessage)
          }
          
          throw new Error(errorMessage)
        } catch (parseError) {
          throw new Error('Failed to create payment order. Please check your configuration.')
        }
      }

      const orderData = await orderResponse.json()

      // Initialize Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Karigar-Mart',
        description: paymentType === 'signup' ? 'Artisan Registration Fee' : 'Order Payment',
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // Verify payment on server
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                paymentType: paymentType,
              }),
            })

            if (!verifyResponse.ok) {
              const error = await verifyResponse.json()
              throw new Error(error.error || 'Payment verification failed')
            }

            // Payment successful
            if (paymentType === 'signup') {
              // Update session for signup payment
              await update({ paid: true })
              // Wait for session to update
              await new Promise((r) => setTimeout(r, 1000))
              setIsSuccess(true)
              toast.success('Payment successful! Redirecting to dashboard...')
              setTimeout(() => {
                window.location.href = '/dashboard'
              }, 2000)
            } else {
              // Clear cart for cart checkout
              clearCartCache()
              queryClient.invalidateQueries({ queryKey: ['cart'] })
              setIsSuccess(true)
              toast.success('Payment successful! Order placed.')
              setTimeout(() => {
                router.push('/')
              }, 2000)
            }
          } catch (error: any) {
            console.error('Payment verification error:', error)
            toast.error(error.message || 'Payment verification failed')
            setIsProcessing(false)
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#000000',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false)
            toast.info('Payment cancelled')
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()

    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Failed to initialize payment')
      setIsProcessing(false)
    }
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
            <p className="text-sm text-muted-foreground">
              {paymentType === 'signup'
                ? "Redirecting to your dashboard..."
                : "Redirecting to home..."}
            </p>
            <Button
              onClick={() => {
                if (paymentType === 'signup') {
                  window.location.href = '/dashboard'
                } else {
                  router.push('/')
                }
              }}
              className="mt-4"
              variant="default"
            >
              {paymentType === 'signup'
                ? "Go to Dashboard"
                : "Continue Shopping"}
            </Button>
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
                <span className="text-2xl font-bold text-black">
                  ${totalNumber.toFixed(2)}
                </span>
              </div>
              {paymentType === 'signup' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Artisan Registration Fee
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard size={20} />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                  <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
                    RZ
                  </div>
                  <div>
                    <p className="font-medium">Razorpay</p>
                    <p className="text-sm text-muted-foreground">
                      Secure payment gateway
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  You will be redirected to Razorpay's secure payment page to complete your payment.
                  We support all major payment methods including Credit/Debit cards, UPI, Net Banking, and Wallets.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Button */}
          <Button
            className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3"
            onClick={handlePayment}
            disabled={isProcessing || !razorpayLoaded}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Payment...
              </div>
            ) : !razorpayLoaded ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading Payment Gateway...
              </div>
            ) : (
              `Pay $${totalNumber.toFixed(2)}`
            )}
          </Button>

          {/* Security Notice */}
          <div className="text-center text-sm text-muted-foreground">
            <p>🔒 Your payment is secured by Razorpay</p>
            <p className="mt-1 text-xs">
              All payments are processed through Razorpay's secure payment infrastructure.
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}