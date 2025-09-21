import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const productName = formData.get('productName') as string

    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    if (!productName) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    // Convert image file to base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const base64ImageData = Buffer.from(arrayBuffer).toString('base64')

    // Determine MIME type
    const mimeType = imageFile.type || 'image/jpeg'

    // Get the generative model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.3,
      }
    })

    // Generate both description and narration in a single API call
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64ImageData,
        },
      },
      { 
        text: `Analyze this product image for "${productName}" and provide two sections:

1. PRODUCT DESCRIPTION: Create a concise (max 100 words) yet detailed, engaging product description suitable for an e-commerce listing. Include details about the product's appearance, materials, style, and any notable features. Make it compelling for potential customers.

2. VIDEO NARRATION: Create a detailed 8-second advertisement narration that includes:
   - A highly detailed description of the product's physical appearance, materials, colors, textures, and visual features
   - Either a voiceover or conversation between 2+ people (specify gender and roles)
   - Detailed timing instructions (what happens when, in seconds)
   - Visual descriptions of how the video should look
   - Specific dialogue/script with exact words to be spoken
   - Avoid text overlays - focus on audio narration
   - Make it engaging and highlight the product's unique selling points

Format your response exactly like this:

<VIDEO_DESCRIPTION_STARTS>
[Your product description here]
<VIDEO_DESCRIPTION_ENDS>

<VIDEO_NARRATION_STARTS>
[Your detailed video narration here]
<VIDEO_NARRATION_ENDS>` 
      }
    ])

    const responseText = result.response.text()
    
    if (!responseText || responseText.trim().length === 0) {
      return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
    }

    console.log('AI Response:', responseText) // Debug log

    // Extract content between delimiters
    const descriptionMatch = responseText.match(/<VIDEO_DESCRIPTION_STARTS>([\s\S]*?)<VIDEO_DESCRIPTION_ENDS>/)
    const narrationMatch = responseText.match(/<VIDEO_NARRATION_STARTS>([\s\S]*?)<VIDEO_NARRATION_ENDS>/)

    if (!descriptionMatch || !narrationMatch) {
      console.error('Failed to find required delimiters in AI response')
      console.error('Raw response:', responseText)
      return NextResponse.json({ error: 'AI response missing required delimiters' }, { status: 500 })
    }

    const description = descriptionMatch[1].trim()
    const narration = narrationMatch[1].trim()

    if (!description || !narration) {
      return NextResponse.json({ error: 'AI response contains empty content' }, { status: 500 })
    }

    console.log('Extracted Description:', description) // Debug log
    console.log('Extracted Narration:', narration) // Debug log

    return NextResponse.json({
      success: true,
      description,
      narration
    })

  } catch (error) {
    console.error('Error generating description and narration:', error)
    return NextResponse.json(
      { error: 'Failed to generate description and narration' },
      { status: 500 }
    )
  }
}
