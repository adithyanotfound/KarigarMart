"use client"

import { ShoppingCart, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCart } from "@/hooks/use-cart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavigationProps {
  isHidden?: boolean
}

export function Navigation({ isHidden = false }: NavigationProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { cartCount } = useCart()

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

  if (isHidden) {
    return null
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="text-white font-bold text-lg">
          KarigarMart
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
                className="absolute -top-1 -right-1 bg-black text-white border-none min-w-[20px] h-5 text-xs flex items-center justify-center"
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
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#404040]">
                <DropdownMenuItem onClick={handleProfileClick} className="text-white hover:bg-[#404040]">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {session.user.role === 'ARTISAN' && (
                  <DropdownMenuItem 
                    onClick={() => router.push('/dashboard')} 
                    className="text-white hover:bg-[#404040]"
                  >
                    Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[#404040]" />
                <DropdownMenuItem onClick={handleSignOut} className="text-white hover:bg-[#404040]">
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
