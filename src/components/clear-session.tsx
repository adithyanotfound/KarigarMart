"use client"

import { useEffect } from "react"

export function ClearSession() {
  useEffect(() => {
    // Clear any problematic NextAuth cookies on mount
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';')
      
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        
        if (name.includes('next-auth') || name.includes('__Secure-next-auth')) {
          // Clear the cookie by setting it to expire in the past
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
        }
      })
    }
  }, [])

  return null
}
