"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

interface ArtisanOnboardingGuardProps {
  children: React.ReactNode
}

async function checkArtisanOnboardingStatus() {
  const response = await fetch('/api/artisan/onboarding/status')
  if (!response.ok) {
    throw new Error('Failed to check onboarding status')
  }
  return response.json()
}

export function ArtisanOnboardingGuard({ children }: ArtisanOnboardingGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  const { data: onboardingStatus, isLoading, error } = useQuery({
    queryKey: ['artisan-onboarding-status'],
    queryFn: checkArtisanOnboardingStatus,
    enabled: !!session && session.user.role === 'ARTISAN',
    retry: false,
  })

  useEffect(() => {
    if (status === "loading" || isLoading) return // Still loading

    // Only check for artisans
    if (session?.user.role !== 'ARTISAN') {
      setIsChecking(false)
      return
    }

    // Redirect unpaid artisans to payment immediately
    if ((session.user as any).paid === false) {
      router.push('/payment?total=10.00&type=signup')
      return
    }

    // If we have onboarding status data
    if (onboardingStatus !== undefined) {
      if (!onboardingStatus.hasCompletedOnboarding) {
        // Redirect to onboarding if not completed
        router.push('/onboarding')
        return
      }
      setIsChecking(false)
    }

    // Handle error case
    if (error) {
      console.error('Error checking onboarding status:', error)
      setIsChecking(false)
    }
  }, [session, status, onboardingStatus, isLoading, error, router])

  // Show loading while checking authentication and onboarding status
  if (status === "loading" || isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-foreground mb-2">Loading...</div>
          <div className="text-sm text-muted-foreground">Checking your profile status</div>
        </div>
      </div>
    )
  }

  // Don't render children if onboarding requirements aren't met
  if (session?.user.role === 'ARTISAN' && onboardingStatus && !onboardingStatus.hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-foreground mb-2">Redirecting to onboarding...</div>
          <div className="text-sm text-muted-foreground">Please complete your profile setup</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
