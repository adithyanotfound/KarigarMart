import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getArtisanProfileId(userId: string) {
  const artisanProfile = await prisma.artisanProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return artisanProfile?.id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'ARTISAN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const artisanProfileId = await getArtisanProfileId(session.user.id);

    if (!artisanProfileId) {
      return NextResponse.json({ error: "Artisan profile not found" }, { status: 404 });
    }

    // 1. Total Sales
    const totalSales = await prisma.orderItem.aggregate({
      _sum: {
        price: true,
      },
      where: {
        product: {
          artisanId: artisanProfileId,
        },
      },
    });

    // 2. Sales This Month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const salesThisMonth = await prisma.orderItem.aggregate({
        _sum: {
            price: true,
        },
        where: {
            product: {
                artisanId: artisanProfileId,
            },
            order: {
                createdAt: {
                    gte: startOfMonth,
                },
            },
        },
    });

    // 3. Past Order Details
    const pastOrders = await prisma.order.findMany({
      where: {
        orderItems: {
          some: {
            product: {
              artisanId: artisanProfileId,
            },
          },
        },
      },
      include: {
        orderItems: {
          where: {
            product: {
              artisanId: artisanProfileId,
            },
          },
          include: {
            product: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 4. Individual Product Stats
    const products = await prisma.product.findMany({
        where: { artisanId: artisanProfileId },
        include: {
            orderItems: true,
        },
    });

    const productStats = products.map(product => {
        const totalQuantitySold = product.orderItems.reduce((acc, item) => acc + item.quantity, 0);
        const totalRevenue = product.orderItems.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
        return {
            id: product.id,
            title: product.title,
            totalQuantitySold,
            totalRevenue,
        };
    });


    return NextResponse.json({
      totalSales: Number(totalSales._sum.price) || 0,
      salesThisMonth: Number(salesThisMonth._sum.price) || 0,
      pastOrders,
      productStats,
    });

  } catch (error) {
    console.error("Error fetching artisan stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch artisan stats" },
      { status: 500 }
    );
  }
}
