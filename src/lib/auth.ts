import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import type { Adapter } from "next-auth/adapters"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            artisanProfile: true
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          paid: (user as any).paid ?? true
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role
        ;(token as any).paid = (user as any).paid ?? false
      }
      // Allow client-triggered session updates to modify the paid flag
      if (trigger === 'update' && session && Object.prototype.hasOwnProperty.call(session, 'paid')) {
        // Fetch latest user data from database to ensure we have the most up-to-date paid status
        if (token.sub) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { paid: true }
            })
            if (dbUser) {
              ;(token as any).paid = dbUser.paid ?? false
            } else {
              ;(token as any).paid = (session as any).paid === true
            }
          } catch (error) {
            // Fallback to session value if database fetch fails
            ;(token as any).paid = (session as any).paid === true
          }
        } else {
          ;(token as any).paid = (session as any).paid === true
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = (token as any).role as string
        ;(session.user as any).paid = (token as any).paid ?? true
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin"
  }
}
