"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Truck, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

// Define types for order data
interface Product {
  id: string;
  title: string;
  imageUrl: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  product: Product;
}

interface Order {
  id: string;
  status: 'RECEIVED' | 'IN_TRANSIT' | 'DELIVERED';
  createdAt: string;
  total: string;
  orderItems: OrderItem[];
}

const getOrderStatus = (createdAt: string): { status: 'RECEIVED' | 'IN_TRANSIT' | 'DELIVERED'; icon: React.ElementType } => {
  const now = new Date();
  const orderDate = new Date(createdAt);
  const diffInHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);

  if (diffInHours >= 48) {
    return { status: 'DELIVERED', icon: CheckCircle };
  } else if (diffInHours >= 24) {
    return { status: 'IN_TRANSIT', icon: Truck };
  } else {
    return { status: 'RECEIVED', icon: Package };
  }
};


export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/order');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading your orders...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Error: {error}</div>
      </div>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="text-foreground"
            >
              <ArrowLeft size={20} className="mr-2" />
              Home
            </Button>
            <h1 className="font-semibold text-foreground">My Orders</h1>
            <div className="w-16" /> {/* Spacer */}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {orders.length > 0 ? (
            orders.map((order, index) => {
              const { status, icon: StatusIcon } = getOrderStatus(order.createdAt);
              return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id.substring(0, 8)}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={
                        status === 'DELIVERED' ? 'default' :
                        status === 'IN_TRANSIT' ? 'secondary' : 'outline'
                      } className="flex items-center gap-1">
                        <StatusIcon size={14} />
                        {status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {order.orderItems.map(item => (
                      <div key={item.id} className="flex gap-4 items-center">
                        <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{item.product.title}</h4>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-foreground">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-end">
                      <p className="text-lg font-bold text-foreground">
                        Total: ${Number(order.total).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )})
          ) : (
            <div className="text-center py-20">
              <h2 className="text-xl font-semibold text-foreground">No orders yet</h2>
              <p className="text-muted-foreground mt-2">You haven't placed any orders yet. Start shopping!</p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
