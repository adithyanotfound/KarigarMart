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

---
2. VIDEO NARRATION: Create a detailed, **8-second advertisement narration using a two-shot structure (two distinct scenes/visual shifts)**. The narration must include:
   - **Highly precise timing instructions** (e.g., Shot 1: 0-4s, Shot 2: 4-8s) for both visuals and dialogue/voiceover to ensure seamless 8-second flow.
   - A detailed, scene-by-scene **visual description** of the product's physical appearance, materials, colors, textures, and features, which the Veo prompt will translate into a realistic video.
   - Either a voiceover or conversation between 2+ people (specify gender and roles).
   - Visual descriptions of how the video should look (camera movement, setting, lighting, mood).
   - Specific dialogue/script with exact words to be spoken. The script must focus on the product's **Unique Selling Points (USPs)** and **emotional benefit**.
   - **Avoid text completely** (no on-screen text, no subtitles).
   - Make it engaging and highlight the product's unique selling points.

CRITICAL: THE NARRATION MUST BE **EXACTLY** 8 SECONDS LONG AND MUST USE A **CLEAR TWO-SHOT STRUCTURE** with a distinct visual cut/transition around the halfway mark. The voice/dialogue must **CONCLUDE BY 7.0-7.5 SECONDS** to allow for a graceful visual hold/fade with only background audio in the final second.

Format your response exactly like the examples below:

Example 1: Product - "Zara Jute Tote Bag"

<VIDEO_DESCRIPTION_STARTS>
The ultimate eco-chic accessory for your everyday. This structured tote bag is crafted from naturally durable, finely woven jute with sleek contrast stitching. Its minimalist rectangular silhouette provides ample space for essentials, while the soft, tan leather-look handles ensure comfort on the shoulder. Perfect for market runs or city strolls, it blends sustainable material with high street style. A must-have accessory for the modern, conscious consumer.
<VIDEO_DESCRIPTION_ENDS>

<VIDEO_NARRATION_STARTS>
**SHOT 1 (0-4s):**
**Visuals:** A stylish woman (late 20s, professional attire) is quickly walking through a sunlit, contemporary glass lobby. The camera follows her shoulder, showing the **jute tote bag** prominently. The bag's **natural, coarse texture** contrasts beautifully with her crisp white blazer.
**Audio (Voiceover - Female, Confident Tone):** "Need a carry-all that works as hard as you do?"
**Dialogue Timing:** Voiceover line concludes at 3.5 seconds.
**Transition:** Quick cinematic cut to Shot 2 at 4 seconds.

**SHOT 2 (4-8s):**
**Visuals:** Close-up slow-motion shot of the **jute tote bag** being set down on a bright white marble desk. A hand places a black tablet and a pair of sleek sunglasses inside. Focus on the **smooth leather-look handles** and the bag's sturdy, upright structure.
**Audio (Voiceover - Female, Confident Tone):** "The Jute Tote—sustainable style that doesn't compromise on structure."
**Dialogue Timing:** Voiceover line concludes at 7.0 seconds.
**Final Visual:** The bag holds still on the desk, with golden ambient light catching the fibers. Background music (Upbeat, minimal lo-fi pop) fades out gracefully by 8.0 seconds.
<VIDEO_NARRATION_ENDS>

Example 2: Product - "Aurora Smart LED Desk Lamp"

<VIDEO_DESCRIPTION_STARTS>
Illuminate your workspace with the Aurora Smart LED Desk Lamp, where modern design meets intelligent functionality. Featuring a slim, brushed aluminum arm and a circular, adjustable LED head, this lamp delivers fully customizable lighting. Choose from three color temperatures and five brightness levels via the intuitive touch controls. Its minimalist form factor saves desk space while providing flicker-free, energy-efficient light perfect for reading, studying, or late-night projects. Available in matte black.
<VIDEO_DESCRIPTION_ENDS>

<VIDEO_NARRATION_STARTS>
**SHOT 1 (0-3s):**
**Visuals:** A tight close-up dolly shot tracking along the **matte black, brushed aluminum** arm of the **Aurora Lamp** as it elegantly curves over a wooden desk. A hand (male, focused) lightly taps the **circular touch panel** on the base. The light instantly changes from a **soft warm glow (2700K)** to **crisp daylight white (6500K)**.
**Audio (Voiceover - Male, Calm/Soothing Tone):** "From late-night focus..."
**Dialogue Timing:** Voiceover line concludes at 2.5 seconds.
**Transition:** Fast, clean cut to Shot 2 at 3 seconds.

**SHOT 2 (3-8s):**
**Visuals:** Wide, static shot of a clean workspace at twilight. The lamp is the central focus, casting a bright, **flicker-free white light** over a book and notebook. A female user (early 30s) smiles slightly, focused on her work. The camera slowly zooms in on the bright pool of light.
**Audio (Voiceover - Male, Calm/Soothing Tone):** "...to the perfect light for every project. Aurora: Your intelligent light, effortless control."
**Dialogue Timing:** Voiceover line concludes at 7.5 seconds.
**Final Visual:** The lamp is held in a close-up, radiating light. Subtle ambient music (gentle piano loop) holds for the final half-second before a sharp cut to black at 8.0 seconds.
<VIDEO_NARRATION_ENDS>

Now, please analyze the image for **"${productName}"** and provide the complete two-section response formatted exactly as shown above.
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
