import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
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

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Ensure product exists and belongs to the artisan of this user
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        artisan: {
          include: {
            user: { select: { id: true } }
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.artisan.user.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Best-effort delete of media if hosted on Cloudinary
    const tryDeleteCloudinary = async (url: string | null | undefined, resourceType: 'image' | 'video') => {
      if (!url) return
      try {
        const isCloudinary = /res\.cloudinary\.com\//.test(url)
        if (!isCloudinary) return
        // Extract public_id from secure_url: https://res.cloudinary.com/<cloud>/.../upload/v<ver>/<public_id>.<ext>
        const match = url.match(/upload\/v\d+\/([^\.]+)\.[a-zA-Z0-9]+$/)
        const publicId = match?.[1]
        if (!publicId) return
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
      } catch (e) {
        console.error('Cloudinary delete failed:', e)
      }
    }

    await Promise.all([
      tryDeleteCloudinary(product.imageUrl, 'image'),
      tryDeleteCloudinary(product.videoUrl, 'video')
    ])

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
