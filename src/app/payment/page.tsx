"use client"

import { useState, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CreditCard, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthGuard } from "@/components/auth-guard"

interface PaymentFormData {
  cardNumber: string
  expiry: string
  cvv: string
  name: string
  address: string
  city: string
  zip: string
}

interface FormErrors {
  cardNumber?: string
  expiry?: string
  cvv?: string
  name?: string
  address?: string
  city?: string
  zip?: string
}

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { update } = useSession()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: '',
    address: '',
    city: '',
    zip: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const total = searchParams.get('total') || '0.00'
  const totalNumber = parseFloat(total)

  // Format card number with spaces (1234 5678 9012 3456)
  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\s/g, '')
    const match = cleaned.match(/.{1,4}/g)
    return match ? match.join(' ') : cleaned
  }

  // Format expiry date (MM/YY)
  const formatExpiry = (value: string): string => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4)
    }
    return cleaned
  }

  // Validate card number (16 digits)
  const validateCardNumber = (value: string): boolean => {
    const cleaned = value.replace(/\s/g, '')
    return /^\d{16}$/.test(cleaned)
  }

  // Validate expiry date
  const validateExpiry = (value: string): boolean => {
    const match = value.match(/^(\d{2})\/(\d{2})$/)
    if (!match) return false
    
    const month = parseInt(match[1])
    const year = parseInt(match[2])
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear() % 100
    const currentMonth = currentDate.getMonth() + 1
    
    // Check if month is valid (01-12)
    if (month < 1 || month > 12) return false
    
    // Check if year is valid (current year or future)
    if (year < currentYear) return false
    if (year === currentYear && month < currentMonth) return false
    
    return true
  }

  // Validate CVV (3 or 4 digits)
  const validateCVV = (value: string): boolean => {
    return /^\d{3,4}$/.test(value)
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16)
    const formatted = formatCardNumber(value)
    setFormData({ ...formData, cardNumber: formatted })
    
    if (value.length === 16 && !validateCardNumber(formatted)) {
      setErrors({ ...errors, cardNumber: 'Please enter a valid 16-digit card number' })
    } else if (value.length === 16) {
      const newErrors = { ...errors }
      delete newErrors.cardNumber
      setErrors(newErrors)
    }
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    const formatted = formatExpiry(value)
    setFormData({ ...formData, expiry: formatted })
    
    if (value.length === 4) {
      if (!validateExpiry(formatted)) {
        setErrors({ ...errors, expiry: 'Please enter a valid expiry date' })
      } else {
        const newErrors = { ...errors }
        delete newErrors.expiry
        setErrors(newErrors)
      }
    }
  }

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setFormData({ ...formData, cvv: value })
    
    if (value.length >= 3 && !validateCVV(value)) {
      setErrors({ ...errors, cvv: 'CVV must be 3 or 4 digits' })
    } else if (value.length >= 3) {
      const newErrors = { ...errors }
      delete newErrors.cvv
      setErrors(newErrors)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '')
    setFormData({ ...formData, name: value })
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, address: e.target.value })
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, city: e.target.value.replace(/[^a-zA-Z\s]/g, '') })
  }

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData({ ...formData, zip: value })
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!validateCardNumber(formData.cardNumber)) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number'
    }
    if (!validateExpiry(formData.expiry)) {
      newErrors.expiry = 'Please enter a valid expiry date'
    }
    if (!validateCVV(formData.cvv)) {
      newErrors.cvv = 'CVV must be 3 or 4 digits'
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Please enter cardholder name'
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Please enter street address'
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Please enter city'
    }
    if (!formData.zip || formData.zip.length < 5) {
      newErrors.zip = 'Please enter a valid ZIP code'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }


  const handlePayment = async () => {
    // Validate form before proceeding
    if (!validateForm()) {
      return
    }
    
    setIsProcessing(true)
    
    try {
      // Simulate processing
      await new Promise((r) => setTimeout(r, 1000))

      // If signup payment ($10), mark user as paid
      if (!isNaN(totalNumber) && totalNumber >= 10) {
        try {
          await fetch('/api/payment/complete', { method: 'POST' })
          // Update session JWT so middleware sees paid=true immediately
          await update({ paid: true })
        } catch {}
      }

      setIsSuccess(true)
      // Remove the timeout to prevent race conditions with session update
      // If it's an extra product payment, go back; else go to dashboard
      if (!isNaN(totalNumber) && totalNumber < 10) {
        router.back()
      } else {
        router.push('/dashboard')
      }

    } catch (error) {
      console.error(error)
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
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
            <Button
              onClick={() => router.push('/dashboard')}
              className="mt-4"
              variant="default"
            >
              Go to Dashboard
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
                type="text"
                inputMode="numeric"
                maxLength={19}
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                disabled={isProcessing}
                aria-invalid={!!errors.cardNumber}
                className={errors.cardNumber ? 'border-destructive' : ''}
              />
              {errors.cardNumber && (
                <p className="text-sm text-destructive mt-1">{errors.cardNumber}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="MM/YY"
                  value={formData.expiry}
                  onChange={handleExpiryChange}
                  disabled={isProcessing}
                  aria-invalid={!!errors.expiry}
                  className={errors.expiry ? 'border-destructive' : ''}
                />
                {errors.expiry && (
                  <p className="text-sm text-destructive mt-1">{errors.expiry}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="123"
                  value={formData.cvv}
                  onChange={handleCVVChange}
                  disabled={isProcessing}
                  aria-invalid={!!errors.cvv}
                  className={errors.cvv ? 'border-destructive' : ''}
                />
                {errors.cvv && (
                  <p className="text-sm text-destructive mt-1">{errors.cvv}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Cardholder Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleNameChange}
                disabled={isProcessing}
                aria-invalid={!!errors.name}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
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
                type="text"
                placeholder="123 Main Street"
                value={formData.address}
                onChange={handleAddressChange}
                disabled={isProcessing}
                aria-invalid={!!errors.address}
                className={errors.address ? 'border-destructive' : ''}
              />
              {errors.address && (
                <p className="text-sm text-destructive mt-1">{errors.address}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="New York"
                  value={formData.city}
                  onChange={handleCityChange}
                  disabled={isProcessing}
                  aria-invalid={!!errors.city}
                  className={errors.city ? 'border-destructive' : ''}
                />
                {errors.city && (
                  <p className="text-sm text-destructive mt-1">{errors.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  type="text"
                  inputMode="numeric"
                  placeholder="10001"
                  value={formData.zip}
                  onChange={handleZipChange}
                  disabled={isProcessing}
                  aria-invalid={!!errors.zip}
                  className={errors.zip ? 'border-destructive' : ''}
                />
                {errors.zip && (
                  <p className="text-sm text-destructive mt-1">{errors.zip}</p>
                )}
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
