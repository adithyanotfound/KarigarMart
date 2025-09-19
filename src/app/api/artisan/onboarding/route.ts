import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

async function summarizeText(text: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.3,
      }
    })

    const result = await model.generateContent([
      {
        text: `You are a professional writer. Create a concise, informative "About Artisan" section that captures the key points and main ideas from the provided text.

Please provide a comprehensive "About Artisan" for the following text:

${text}

IMPORTANT: Only return the summary, do not return anything else.`
      }
    ])

    return result.response.text()
  } catch (error) {
    throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

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

    const { story, about } = await request.json()

    if (!story) {
      return NextResponse.json(
        { error: 'Story is required' },
        { status: 400 }
      )
    }

    if (!about) {
      return NextResponse.json(
        { error: 'About section is required' },
        { status: 400 }
      )
    }

    // Generate rephrased about section using AI
    let rephrasedAbout: string
    try {
      rephrasedAbout = await summarizeText(about)
    } catch (error) {
      console.error('Error generating summary:', error)
      // Fallback to original text if summarization fails
      rephrasedAbout = about
    }

    // Create artisan profile
    const artisanProfile = await prisma.artisanProfile.create({
      data: {
        userId: session.user.id,
        story,
        about: rephrasedAbout
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
