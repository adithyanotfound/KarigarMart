import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Handle cursor properly - only use it if it's a valid UUID, not "0" or other invalid values
    const isValidCursor = cursor && cursor !== '0' && cursor.length > 10

    // For random loading, we'll get all products and randomize them
    // This ensures infinite scroll with repeated content
    const allProducts = await prisma.product.findMany({
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

    // Shuffle the products randomly
    const shuffledProducts = allProducts.sort(() => Math.random() - 0.5)
    
    // If we have a cursor, find the position and continue from there
    let startIndex = 0
    if (isValidCursor) {
      const cursorIndex = shuffledProducts.findIndex(p => p.id === cursor)
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0
    }

    // If we've reached the end, cycle back to the beginning
    if (startIndex >= shuffledProducts.length) {
      startIndex = 0
    }

    // Get the next batch, cycling if necessary
    const products = []
    for (let i = 0; i < limit; i++) {
      const index = (startIndex + i) % shuffledProducts.length
      if (shuffledProducts[index]) {
        products.push(shuffledProducts[index])
      }
    }

    // Always provide a next cursor to enable infinite scroll
    const nextCursor = products.length > 0 ? products[products.length - 1].id : null

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
