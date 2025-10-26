"use client"

import { ShoppingCart, User, LogOut, Search, X, Package, LayoutDashboard, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCart } from "@/hooks/use-cart"
import { useLanguage } from "@/contexts/language-context"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
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
  const { t } = useLanguage()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

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

  const handleLanguageSettings = () => {
    router.push('/language-settings')
  }

  // Search functions
  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.products || [])
        setShowSuggestions(true)
      } else {
        setSearchResults([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
      setShowSuggestions(false)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      searchProducts(query)
    }, 300)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setShowSuggestions(false)
      setSearchQuery("")
    }
  }

  const handleSuggestionClick = (productId: string) => {
    router.push(`/product/${productId}`)
    setShowSuggestions(false)
    setSearchQuery("")
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setShowSuggestions(false)
  }

  // Mobile search functions
  const handleMobileSearchClick = () => {
    setIsMobileSearchExpanded(true)
    setTimeout(() => {
      mobileSearchInputRef.current?.focus()
    }, 100)
  }

  const handleMobileSearchClose = () => {
    setIsMobileSearchExpanded(false)
    setSearchQuery("")
    setShowSuggestions(false)
  }

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setIsMobileSearchExpanded(false)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
      
      // Close mobile search when clicking outside
      if (isMobileSearchExpanded && !(event.target as Element).closest('.mobile-search-container')) {
        handleMobileSearchClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileSearchExpanded])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  if (isHidden) {
    return null
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/20 shadow-lg">
      {/* Mobile Search Expanded State */}
      {isMobileSearchExpanded ? (
        <div className="mobile-search-container flex items-center px-4 py-3">
          <form onSubmit={handleMobileSearchSubmit} className="flex-1 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder={t("navigation.searchProducts")}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-300 focus:bg-white/20 focus:border-white/40"
                />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMobileSearchClose}
              className="text-white hover:bg-white/10"
            >
              <X size={20} />
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="text-white font-bold text-lg drop-shadow-lg">
            KarigarMart
          </div>

          {/* Desktop Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-md mx-4" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t("navigation.searchProducts")}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-300 focus:bg-white/20 focus:border-white/40"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Search Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-50">
                  {isSearching ? (
                    <div className="p-3 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mx-auto"></div>
                      <span className="ml-2">{t("navigation.searching")}</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-1">
                      {searchResults.slice(0, 5).map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleSuggestionClick(product.id)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        >
                          <div className="font-medium text-gray-900 truncate">{product.title}</div>
                          <div className="text-sm text-gray-500 truncate">{product.description}</div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim() && !isSearching ? (
                    <div className="p-3 text-center text-gray-500">
                      {t("navigation.noProductsFound", { query: searchQuery })}
                    </div>
                  ) : null}
                </div>
              )}
            </form>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Mobile Search Icon */}
            <Button
              size="sm"
              variant="ghost"
              className="md:hidden text-white hover:bg-white/10"
              onClick={handleMobileSearchClick}
            >
              <Search size={20} />
            </Button>

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
                    {t("navigation.profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => router.push('/orders')} 
                    className="text-white hover:bg-[#404040]"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {t("navigation.pastOrders")}
                  </DropdownMenuItem>
                  {session.user.role === 'ARTISAN' && (
                    <DropdownMenuItem 
                      onClick={() => router.push('/dashboard')} 
                      className="text-white hover:bg-[#404040]"
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {t("navigation.dashboard")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={handleLanguageSettings} 
                    className="text-white hover:bg-[#404040]"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    {t("language.changeLanguage")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#404040]" />
                  <DropdownMenuItem onClick={handleSignOut} className="text-white hover:bg-[#404040]">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("auth.signOut")}
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
                {t("auth.signIn")}
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
