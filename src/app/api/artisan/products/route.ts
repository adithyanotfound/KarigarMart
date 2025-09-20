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

    // Parse form data
    const formData = await request.formData()
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const price = formData.get("price") as string
    const imageFile = formData.get("image") as File

    if (!title || !description || !price || !imageFile) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
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

    // Pick a default video
    const defaultVideoUrls = [
      "https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/3f42e166-6ce9-47f0-a4b9-6cf1cbbddc1c.mp4",
      "https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/4be137dc-5450-43e3-a98b-57206a3e6360.mp4",
      "https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/2f185801-a7b3-4548-822e-1cc16aa478fd.mp4",
      "https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/ae41b08a-794c-4131-93e5-d0a82f6df682.mp4",
      "https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/7985448e-5b0c-42fa-ad02-2e924d9ace90.mp4",
    ]
    const randomVideoUrl = defaultVideoUrls[Math.floor(Math.random() * defaultVideoUrls.length)]

    // Create product in Prisma
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: Number(price),
        imageUrl,
        videoUrl: randomVideoUrl,
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

    return NextResponse.json({
      message: "Product created successfully",
      product,
    })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}