"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/contexts/language-context"
import Link from "next/link"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t("auth.invalidCredentials"))
        toast.error(t("auth.invalidCredentials"))
      } else {
        toast.success(t("auth.welcomeBackMessage"))
        // Get updated session to check user role
        await new Promise((res) => setTimeout(res, 500)); 
        const session = await getSession()
        
        if (session?.user?.role === 'ARTISAN') {
          router.push('/dashboard') // The ArtisanOnboardingGuard will handle the redirect
        } else {
          router.push('/')
        }
      }
    } catch {
      setError(t("common.error"))
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-end mb-4">
              <LanguageSelector />
            </div>
            <CardTitle className="text-2xl font-bold">{t("auth.welcomeBack")}</CardTitle>
            <CardDescription>
              {t("auth.signIn")} {t("auth.joinKarigarMart")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.enterEmail")}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.enterPassword")}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-black hover:bg-gray-800" 
                disabled={isLoading}
              >
                {isLoading ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("auth.dontHaveAccount")}{" "}
                <Link 
                  href="/auth/signup" 
                  className="text-gray-600 hover:text-black font-medium"
                >
                  {t("auth.signUp")}
                </Link>
              </p>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground text-center">
                <strong>{t("auth.demoAccounts")}:</strong><br />
                {t("auth.userDemo")}<br />
                {t("auth.artisanDemo")}<br />
                {t("auth.demoPassword")}
              </p>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </AuthGuard>
  )
}
