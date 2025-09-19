import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

async function summarizeText(text: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
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
    const { text } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text provided for summarization' },
        { status: 400 }
      )
    }

    // Generate summary using Gemini
    const summary = await summarizeText(text)

    if (!summary || summary.trim().length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      summary: summary.trim()
    })

  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
