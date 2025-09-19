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

    if (!user || user.role !== 'ARTISAN' || !user.artisanProfile) {
      return NextResponse.json(
        { error: 'Artisan profile not found' },
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and artisan profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { artisanProfile: true }
    })

    if (!user || user.role !== 'ARTISAN' || !user.artisanProfile) {
      return NextResponse.json(
        { error: 'Artisan profile not found' },
        { status: 403 }
      )
    }

    const { title, description, price, imageUrl, videoUrl } = await request.json()

    // Validation
    if (!title || !description || !price || !imageUrl || !videoUrl) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      return NextResponse.json(
        { error: 'Price must be a valid positive number' },
        { status: 400 }
      )
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: Number(price),
        imageUrl,
        videoUrl,
        artisanId: user.artisanProfile.id
      },
      include: {
        artisan: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Send POST request to external API as specified in requirements
    try {
      await fetch('http://localhost:3001/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageUrl,
          name: title,
          description: description
        }),
      })
    } catch (externalApiError) {
      console.error('Failed to notify external API:', externalApiError)
      // Don't fail the product creation if external API fails
    }

    return NextResponse.json({
      message: 'Product created successfully',
      product
    })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
