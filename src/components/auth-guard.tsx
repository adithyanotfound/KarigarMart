"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = false, 
  redirectTo = "/auth/signin" 
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (requireAuth && !session) {
      // User needs to be authenticated but isn't
      router.push(redirectTo)
      return
    }

    if (!requireAuth && session) {
      // User is authenticated but shouldn't be (like on auth pages)
      router.push("/")
      return
    }
  }, [session, status, requireAuth, redirectTo, router])

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  // Don't render children if auth requirements aren't met
  if (requireAuth && !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Redirecting to sign in...</div>
      </div>
    )
  }

  if (!requireAuth && session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Redirecting...</div>
      </div>
    )
  }

  return <>{children}</>
}
