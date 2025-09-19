import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to add CORS headers to responses
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Two modes: Update existing product OR Create new product
    const isUpdateMode = 'productId' in body
    const isCreateMode = 'title' in body && 'description' in body && 'price' in body

    if (!isUpdateMode && !isCreateMode) {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Invalid request format',
          message: 'Either provide productId and videoUrl to update existing product, or provide title, description, price, artisanId, and videoUrl to create new product',
          updateFormat: { productId: 'string', videoUrl: 'string' },
          createFormat: { title: 'string', description: 'string', price: 'number', artisanId: 'string', videoUrl: 'string', imageUrl: 'string (optional)' }
        },
        { status: 400 }
      ))
    }

    // UPDATE EXISTING PRODUCT
    if (isUpdateMode) {
      const { productId, videoUrl } = body

      if (!productId || !videoUrl) {
        return addCorsHeaders(NextResponse.json(
          { 
            error: 'Missing required fields for update',
            required: ['productId', 'videoUrl'],
            received: { productId: !!productId, videoUrl: !!videoUrl }
          },
          { status: 400 }
        ))
      }

      // Validate that productId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(productId)) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Invalid productId format. Must be a valid UUID.' },
          { status: 400 }
        ))
      }

      // Validate that videoUrl is a proper URL
      try {
        new URL(videoUrl)
      } catch {
        return addCorsHeaders(NextResponse.json(
          { error: 'Invalid videoUrl format. Must be a valid URL.' },
          { status: 400 }
        ))
      }

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
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

      if (!existingProduct) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Product not found with the provided productId' },
          { status: 404 }
        ))
      }

      // Update the product with the new video URL
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: { videoUrl },
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

      return addCorsHeaders(NextResponse.json({
        success: true,
        message: 'Video URL updated successfully',
        product: {
          id: updatedProduct.id,
          title: updatedProduct.title,
          description: updatedProduct.description,
          price: updatedProduct.price,
          imageUrl: updatedProduct.imageUrl,
          videoUrl: updatedProduct.videoUrl,
          artisan: updatedProduct.artisan.user.name,
          publishDate: updatedProduct.publishDate
        }
      }))
    }

    // CREATE NEW PRODUCT
    if (isCreateMode) {
      const { title, description, price, artisanId, videoUrl, imageUrl } = body

      // Validation
      if (!title || !description || !price || !artisanId || !videoUrl) {
        return addCorsHeaders(NextResponse.json(
          { 
            error: 'Missing required fields for creation',
            required: ['title', 'description', 'price', 'artisanId', 'videoUrl'],
            optional: ['imageUrl'],
            received: { 
              title: !!title, 
              description: !!description, 
              price: !!price, 
              artisanId: !!artisanId, 
              videoUrl: !!videoUrl,
              imageUrl: !!imageUrl 
            }
          },
          { status: 400 }
        ))
      }

      // Validate price
      if (isNaN(Number(price)) || Number(price) <= 0) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Price must be a valid positive number' },
          { status: 400 }
        ))
      }

      // Validate artisanId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(artisanId)) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Invalid artisanId format. Must be a valid UUID.' },
          { status: 400 }
        ))
      }

      // Validate videoUrl
      try {
        new URL(videoUrl)
      } catch {
        return addCorsHeaders(NextResponse.json(
          { error: 'Invalid videoUrl format. Must be a valid URL.' },
          { status: 400 }
        ))
      }

      // Check if artisan exists
      const artisan = await prisma.artisanProfile.findUnique({
        where: { id: artisanId },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      })

      if (!artisan) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Artisan not found with the provided artisanId' },
          { status: 404 }
        ))
      }

      // Use default image if not provided
      const defaultImageUrl = imageUrl || 'https://files.edgestore.dev/t2h0nztfikica7r2/advAutomation/_public/d2abc28d-2af7-4ef4-a956-c82f84484933.jpeg'

      // Create new product
      const newProduct = await prisma.product.create({
        data: {
          title,
          description,
          price: Number(price),
          imageUrl: defaultImageUrl,
          videoUrl,
          artisanId
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

      return addCorsHeaders(NextResponse.json({
        success: true,
        message: 'Product created successfully',
        product: {
          id: newProduct.id,
          title: newProduct.title,
          description: newProduct.description,
          price: newProduct.price,
          imageUrl: newProduct.imageUrl,
          videoUrl: newProduct.videoUrl,
          artisan: newProduct.artisan.user.name,
          publishDate: newProduct.publishDate
        }
      }))
    }

  } catch (error) {
    console.error('Error updating product video:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to update product video URL'
      },
      { status: 500 }
    ))
  }
}
