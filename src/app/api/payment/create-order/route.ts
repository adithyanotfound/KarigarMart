import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Razorpay from "razorpay"

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables first - BEFORE any other operations
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    
    if (!keyId || !keySecret) {
      const errorDetails = {
        hasKeyId: !!keyId,
        hasKeySecret: !!keySecret,
        keyIdLength: keyId?.length || 0,
        keySecretLength: keySecret?.length || 0,
      }
      console.error('Razorpay credentials missing:', errorDetails)
      
      return NextResponse.json(
        { 
          error: 'Razorpay credentials are not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file and restart the server.',
          details: errorDetails
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Get session
    let session
    try {
      session = await getServerSession(authOptions)
    } catch (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      )
    }
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Request body parse error:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { amount, currency = 'USD', paymentType = 'cart' } = body

    // Initialize Razorpay instance after validation
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    // Convert amount to cents (Razorpay uses smallest currency unit)
    // For USD, amount should be in cents (100 cents = $1)
    const amountInCents = Math.round(amount * 100)

    // Generate a short receipt ID (Razorpay requires max 40 characters)
    // Format: timestamp (10) + user id first 8 chars (8) + payment type first char (1) = 19 chars
    const timestamp = Date.now().toString().slice(-10) // Last 10 digits of timestamp
    const userIdShort = session.user.id.replace(/-/g, '').substring(0, 8) // First 8 chars of UUID without dashes
    const receiptId = `rcpt_${timestamp}_${userIdShort}_${paymentType.charAt(0)}` // Max 25 chars

    const options = {
      amount: amountInCents,
      currency: currency,
      receipt: receiptId, // Must be <= 40 characters
      notes: {
        userId: session.user.id,
        paymentType: paymentType, // 'cart' or 'signup'
        timestamp: Date.now().toString(),
      },
    }

    const order = await razorpay.orders.create(options)

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    })

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error)
    
    // Provide more detailed error messages
    let errorMessage = 'Failed to create order'
    if (error.error?.description) {
      errorMessage = error.error.description
    } else if (error.message) {
      errorMessage = error.message
    } else if (error.error?.message) {
      errorMessage = error.error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}