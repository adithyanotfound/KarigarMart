import { NextResponse } from "next/server"

export async function GET() {
  // This endpoint helps debug Razorpay configuration
  // Remove this in production for security
  
  const hasKeyId = !!process.env.RAZORPAY_KEY_ID
  const hasKeySecret = !!process.env.RAZORPAY_KEY_SECRET
  
  return NextResponse.json({
    configured: hasKeyId && hasKeySecret,
    hasKeyId,
    hasKeySecret,
    keyIdLength: process.env.RAZORPAY_KEY_ID?.length || 0,
    keySecretLength: process.env.RAZORPAY_KEY_SECRET?.length || 0,
    // Don't expose actual keys
    keyIdPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 8) || 'NOT SET',
  })
}