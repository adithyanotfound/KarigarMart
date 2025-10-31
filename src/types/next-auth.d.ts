import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      paid: boolean
    }
  }

  interface User {
    role: string
    paid: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    paid: boolean
  }
}
