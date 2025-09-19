import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Define routes that require artisan onboarding
  const artisanProtectedRoutes = ['/dashboard']
  
  // Check if the current path is an artisan-protected route
  const isArtisanRoute = artisanProtectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // If it's an artisan route and user is an artisan
  if (isArtisanRoute && token?.role === 'ARTISAN') {
    // Allow access to onboarding page
    if (pathname === '/onboarding') {
      return NextResponse.next()
    }

    // For other artisan routes, let the ArtisanOnboardingGuard handle the check
    // This middleware just ensures the user is authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*'
  ]
}
