import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Handle cursor properly - only use it if it's a valid UUID, not "0" or other invalid values
    const isValidCursor = cursor && cursor !== '0' && cursor.length > 10

    const products = await prisma.product.findMany({
      take: limit,
      skip: isValidCursor ? 1 : 0,
      cursor: isValidCursor ? { id: cursor } : undefined,
      orderBy: {
        publishDate: 'desc'
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

    const nextCursor = products.length === limit ? products[products.length - 1].id : null

    return NextResponse.json({
      products,
      nextCursor
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
