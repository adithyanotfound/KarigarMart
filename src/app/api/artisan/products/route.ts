import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and artisan profile
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

    if (!user.artisanProfile) {
      return NextResponse.json(
        { error: 'Please complete your artisan onboarding first' },
        { status: 403 }
      )
    }

    // Get artisan's products
    const products = await prisma.product.findMany({
      where: {
        artisanId: user.artisanProfile.id
      },
      orderBy: {
        publishDate: 'desc'
      }
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching artisan products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { artisanProfile: true },
    })

    if (!user || user.role !== "ARTISAN") {
      return NextResponse.json({ error: "User is not an artisan" }, { status: 403 })
    }

    if (!user.artisanProfile) {
      return NextResponse.json(
        { error: "Please complete your artisan onboarding first" },
        { status: 403 }
      )
    }

    // Enforce product limit of 10 per artisan
    const existingCount = await prisma.product.count({
      where: { artisanId: user.artisanProfile.id }
    })
    if (existingCount >= 10) {
      return NextResponse.json(
        { error: "Maximum of 10 products allowed." },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const title = formData.get("title") as string
    const price = formData.get("price") as string
    const imageFile = formData.get("image") as File

    if (!title || !price || !imageFile) {
      return NextResponse.json({ error: "Title, price, and image are required" }, { status: 400 })
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 })
    }

    // -----------------------------
    // Upload image via Express server
    // -----------------------------
    let imageUrl: string
    try {
      // Convert File to ArrayBuffer then to Buffer
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Create FormData for the upload
      const uploadForm = new FormData()
      
      // Create a Blob from the buffer with the correct type
      const blob = new Blob([buffer], { type: imageFile.type })
      uploadForm.append("file", blob, imageFile.name)

      const uploadResponse = await fetch(`${process.env.UPLOAD_SERVER_URL}/upload`, {
        method: 'POST',
        body: uploadForm,
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || "Upload failed")
      }

      imageUrl = uploadResult.data.url
    } catch (uploadError: any) {
      console.error("Image upload error:", uploadError)
      return NextResponse.json(
        { error: `Failed to upload image: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // -----------------------------
    // Generate description and narration using AI
    // -----------------------------
    const descriptionForm = new FormData()
    descriptionForm.append("image", imageFile)
    descriptionForm.append("productName", title)

    const descriptionResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/description`, {
      method: 'POST',
      body: descriptionForm,
    })

    const descriptionResult = await descriptionResponse.json()

    if (!descriptionResult.success) {
      return NextResponse.json(
        { error: `Failed to generate description: ${descriptionResult.error}` },
        { status: 500 }
      )
    }

    const generatedDescription = descriptionResult.description
    const narration = descriptionResult.narration

    // -----------------------------
    // Generate video using the narration
    // -----------------------------
    const generateResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: narration }),
    })

    const generateResult = await generateResponse.json()
    console.log('Generate result:', generateResult) // Debug log

    if (!generateResult.uploadResponse.data.url || !generateResult.url) {
      console.error('No video URL in generate result:', generateResult)
      return NextResponse.json(
        { error: "Failed to generate video advertisement" },
        { status: 500 }
      )
    }

    const videoUrl = generateResult.uploadResponse.data.url || generateResult.url
    console.log('Video URL:', videoUrl) // Debug log

    // Create product in Prisma
    let product
    try {
      product = await prisma.product.create({
        data: {
          title,
          description: generatedDescription,
          price: Number(price),
          imageUrl,
          videoUrl,
          artisanId: user.artisanProfile.id,
        },
        include: {
          artisan: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      })
      console.log('Product created successfully:', product.id) // Debug log
    } catch (dbError: any) {
      console.error('Database error creating product:', dbError)
      return NextResponse.json(
        { error: `Database error: ${dbError.message || 'Unknown database error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Product created successfully with AI-generated description and custom video advertisement",
      product,
    })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}