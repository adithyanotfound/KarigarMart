"use client"

import { useState } from "react"
import { ShoppingCart, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSession, signOut } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

async function fetchCartCount() {
  const response = await fetch('/api/cart')
  if (!response.ok) {
    throw new Error('Failed to fetch cart')
  }
  const data = await response.json()
  return data.items?.length || 0
}

export function Navigation() {
  const { data: session } = useSession()
  const router = useRouter()

  const { data: cartCount = 0 } = useQuery({
    queryKey: ['cart', 'count'],
    queryFn: fetchCartCount,
    enabled: !!session,
    refetchOnWindowFocus: false,
  })

  const handleCartClick = () => {
    if (session) {
      router.push('/cart')
    } else {
      router.push('/auth/signin')
    }
  }

  const handleProfileClick = () => {
    if (session) {
      router.push('/profile')
    } else {
      router.push('/auth/signin')
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="text-white font-bold text-lg">
          ArtisanMarket
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Cart */}
          <Button
            size="sm"
            variant="ghost"
            className="relative text-white hover:bg-white/10"
            onClick={handleCartClick}
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 bg-orange text-white border-none min-w-[20px] h-5 text-xs flex items-center justify-center"
              >
                {cartCount}
              </Badge>
            )}
          </Button>

          {/* User menu */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  <User size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1f1e1d] border-[#262624]">
                <DropdownMenuItem onClick={handleProfileClick} className="text-white hover:bg-[#262624]">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {session.user.role === 'ARTISAN' && (
                  <DropdownMenuItem 
                    onClick={() => router.push('/dashboard')} 
                    className="text-white hover:bg-[#262624]"
                  >
                    Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[#262624]" />
                <DropdownMenuItem onClick={handleSignOut} className="text-white hover:bg-[#262624]">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => router.push('/auth/signin')}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
