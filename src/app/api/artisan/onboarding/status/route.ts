import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an artisan
    if (session.user.role !== 'ARTISAN') {
      return NextResponse.json({ 
        hasCompletedOnboarding: true // Non-artisans don't need onboarding
      })
    }

    // Check if artisan has completed onboarding
    const artisanProfile = await prisma.artisanProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    })

    return NextResponse.json({
      hasCompletedOnboarding: !!artisanProfile
    })

  } catch (error) {
    console.error('Onboarding status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    )
  }
}
