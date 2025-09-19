import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an artisan
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { artisanProfile: true }
    })

    if (!user || user.role !== 'ARTISAN') {
      return NextResponse.json(
        { error: 'User is not an artisan' },
        { status: 403 }
      )
    }

    if (user.artisanProfile) {
      return NextResponse.json(
        { error: 'Artisan profile already exists' },
        { status: 409 }
      )
    }

    const { story } = await request.json()

    if (!story) {
      return NextResponse.json(
        { error: 'Story is required' },
        { status: 400 }
      )
    }

    // Create artisan profile
    const artisanProfile = await prisma.artisanProfile.create({
      data: {
        userId: session.user.id,
        story
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Artisan profile created successfully',
      profile: artisanProfile
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
