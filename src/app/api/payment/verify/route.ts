import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay key secret is missing')
      return NextResponse.json(
        { error: 'Razorpay credentials are not configured. Please check your environment variables.' },
        { status: 500 }
      )
    }

    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentType = 'cart' } = await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400 }
      )
    }

    // Verify the signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex')

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // Payment verified successfully
    if (paymentType === 'signup') {
      // For signup/artisan fee payment
      await prisma.user.update({
        where: { id: session.user.id },
        data: { paid: true }
      })
    } else {
      // For cart checkout - create order
      const cartItems = await prisma.cartItem.findMany({
        where: { userId: session.user.id },
        include: { product: true }
      })

      if (cartItems.length > 0) {
        const total = cartItems.reduce((sum, item) => {
          return sum + (Number(item.product.price) * item.quantity)
        }, 0)

        await prisma.$transaction(async (tx) => {
          await tx.order.create({
            data: {
              userId: session.user.id,
              total,
              orderItems: {
                create: cartItems.map(item => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.product.price
                }))
              }
            }
          })

          await tx.cartItem.deleteMany({
            where: { userId: session.user.id }
          })
        })
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    })

  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}

