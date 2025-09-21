import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ products: [] })
    }

    // Test database connection first
    await prisma.$queryRaw`SELECT 1`

    // Search products by title and description using case-insensitive search
    const products = await prisma.product.findMany({
      where: {
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
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
      },
      take: 10, // Limit to 10 results for suggestions
      orderBy: {
        publishDate: 'desc'
      }
    })

    return NextResponse.json({ products })
  } catch (error: any) {
    console.error('Search error:', error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2024') {
      return NextResponse.json(
        { error: 'Database connection timeout. Please try again.' },
        { status: 503 }
      )
    }
    
    if (error.code === 'P1001') {
      return NextResponse.json(
        { error: 'Database server is unreachable. Please try again later.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    )
  }
}
