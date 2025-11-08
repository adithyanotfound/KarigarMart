"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/contexts/language-context"
import Link from "next/link"

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "USER"
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"))
      toast.error(t("auth.passwordsDoNotMatch"))
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError(t("auth.passwordTooShort"))
      toast.error(t("auth.passwordTooShort"))
      setIsLoading(false)
      return
    }

    try {
      // Create user account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t("common.error"))
        toast.error(data.error || t("common.error"))
        return
      }

      // Auto sign in after successful registration
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (signInResult?.error) {
        setError(t("common.error"))
        toast.error(t("common.error"))
      } else {
        toast.success(t("auth.accountCreatedSuccessfully"))
        // Immediately direct all new signups to payment ($10)
        router.push('/payment?total=10.00&type=signup')
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
            <CardTitle className="text-2xl font-bold">{t("auth.joinKarigarMart")}</CardTitle>
            <CardDescription>
              {t("auth.signUp")} {t("auth.joinKarigarMart")}
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
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("auth.enterFullName")}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t("auth.enterEmail")}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">{t("auth.accountType")}</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("auth.selectAccountType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">{t("auth.customer")}</SelectItem>
                    <SelectItem value="ARTISAN">{t("auth.artisan")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t("auth.createPassword")}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder={t("auth.confirmYourPassword")}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
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
                {isLoading ? t("auth.creatingAccount") : t("auth.signUp")}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("auth.alreadyHaveAccount")}{" "}
                <Link 
                  href="/auth/signin" 
                  className="text-gray-600 hover:text-black font-medium"
                >
                  {t("auth.signIn")}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </AuthGuard>
  )
}
