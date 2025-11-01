import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, quantity, price } = await request.json()

    if (!productId || !quantity || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const userId = session.user.id;

    // Create order with single item
    const order = await prisma.order.create({
      data: {
        userId,
        total: Number(price) * quantity,
        orderItems: {
          create: [{
            productId,
            quantity,
            price: price.toString()
          }]
        }
      },
      include: {
        orderItems: true
      }
    });

    return NextResponse.json(order);

  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}