"use client"

import { SessionProvider } from "next-auth/react"
import { Session } from "next-auth"

interface Props {
  children: React.ReactNode
  session?: Session | null
}

export function AuthSessionProvider({ children, session }: Props) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  )
}
