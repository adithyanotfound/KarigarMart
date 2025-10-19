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
        temperature: 0.75,
        topP: 0.95,
        topK: 50,
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
   - Avoid text completely
   - Make it engaging and highlight the product's unique selling points

CRITICAL: THE NARRATION MUST BE 8 SECONDS LONG. IF CUT SHORT IT WILL BE REJECTED. END THE NARRATION GRACEFULLY.

Format your response exactly like this:

<VIDEO_DESCRIPTION_STARTS>
[Your product description here]
<VIDEO_DESCRIPTION_ENDS>

<VIDEO_NARRATION_STARTS>
[Your detailed video narration here]
<VIDEO_NARRATION_ENDS>

Example narrations:

IMP: THESE NARRATIONS DO NOT INCLUDE PRODUCT DESCRIPTION. YOU ARE REQUIRED TO ONLY GENERATE THE DETAILED DESCRIPITON OF THE PRODUCT + NARRATION AS WELL AS THE PRODUCT DESCRIPTION.

Product 1: Zara jute tote bag

<VIDEO_NARRATION_STARTS>
A stylish Instagram advertisement video for Zara, showcasing a jute tote bag. The setting is an urban street café at golden hour, with warm sunlight and a modern, minimalistic aesthetic. The mood is chic, eco-friendly, and aspirational. Cinematic camera style with smooth motion, no text, no narration. Shot 1 (0–2s): A young fashionable woman in her mid-20s, wearing neutral-toned chic clothing (white sleeveless top, beige linen trousers), walks confidently down a sunlit street with the jute tote bag on her shoulder. The background is softly blurred city life with pastel buildings. Shot 2 (2–5s): Close-up slow-motion of the jute tote bag swaying naturally as she walks. Focus on the rich, textured jute fibers catching golden sunlight, giving the bag a luxurious eco-friendly vibe. Shot 3 (5–7s): The woman sets the bag down on a wooden café table beside an iced coffee. Camera smoothly tracks the bag, making it the centerpiece of the frame. Shot 4 (7–8s, Final Hero Shot): Cinematic close-up of the tote bag on the table, glowing in warm sunlight, with the blurred silhouette of the woman sipping coffee in the background. Audio: Upbeat, minimal lo-fi house track with a trendy Instagram reel vibe. Subtle ambient café sounds (soft chatter, clinking cups, breeze) under the music. No voices, no text.
<VIDEO_NARRATION_ENDS>

Product 2: Zara jute tote bag

<VIDEO_NARRATION_STARTS>
A bright, trendy outdoor café scene during golden hour with soft sunlight reflecting off glass windows. The camera pans smoothly across a wooden table where a stylish young woman (mid-20s, South Asian, with long wavy hair, chic casual outfit – white linen shirt and light blue jeans) places a minimal, eco-friendly jute tote bag on the table. The tote bag looks premium, textured with natural fibers, and stands out against the warm background. She adjusts her sunglasses and smiles confidently as she grabs the tote by its handles. The video cuts to a slow-motion shot of her walking past green plants with the tote swinging naturally at her side. In the background, blurred city life adds movement without distracting from the bag. Background music: upbeat, modern lo-fi pop with light percussion and warm synths, catchy enough to feel trendy but not overwhelming. Voiceover pitch (female, confident yet friendly tone): 'Eco is the new chic. Carry style that cares. Discover evrgrn's jute tote – your everyday essential, reimagined.' Ambient sound design: subtle café chatter and clinking cups at the beginning, fading into upbeat background music as the focus shifts to the walking scene. Ending (last 2 seconds): camera zooms slightly closer to the tote bag as sunlight highlights its natural fibers. Music hits a crisp beat drop right at the end for emphasis.
<VIDEO_NARRATION_ENDS>
` 
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
