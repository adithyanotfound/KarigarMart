"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ArrowLeft, User, Mail, Calendar, LogOut, Settings, Edit, Save, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AuthGuard } from "@/components/auth-guard"
import { useLanguage } from "@/contexts/language-context"

async function fetchUserProfile() {
  const response = await fetch('/api/user/profile')
  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }
  return response.json()
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    story: '',
    about: ''
  })

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-profile'],
    queryFn: fetchUserProfile,
    enabled: !!session,
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      setIsEditing(false)
      toast.success(t("profile.profile") + " " + t("common.success"))
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        story: profile.artisanProfile?.story || '',
        about: profile.artisanProfile?.about || ''
      })
      setIsEditing(true)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({ name: '', story: '', about: '' })
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error(t("auth.fullName") + " " + t("common.error"))
      return
    }
    updateProfileMutation.mutate(formData)
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-foreground"
          >
            <ArrowLeft size={20} className="mr-2" />
            {t("common.back")}
          </Button>
          <h1 className="font-semibold text-foreground">{t("profile.profile")}</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">{t("common.loading")}</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500">{t("common.error")}</div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Profile Card */}
            <Card>
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-white" />
                </div>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("auth.fullName")}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t("auth.enterFullName")}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-xl">{profile?.name}</CardTitle>
                    <CardDescription className="flex items-center justify-center gap-2">
                      <Badge 
                        variant={profile?.role === 'ARTISAN' ? 'default' : 'secondary'}
                        className={profile?.role === 'ARTISAN' ? 'bg-black text-white' : ''}
                      >
                        {profile?.role === 'ARTISAN' ? t("auth.artisan") : t("auth.customer")}
                      </Badge>
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{profile?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="text-foreground">
                    {t("profile.profile")} {new Date(profile?.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Artisan Profile */}
            {profile?.role === 'ARTISAN' && profile?.artisanProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("profile.profile")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="story">{t("profile.profile")}</Label>
                        <Textarea
                          id="story"
                          value={formData.story}
                          onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                          placeholder={t("profile.profile")}
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="about">{t("profile.profile")}</Label>
                        <Textarea
                          id="about"
                          value={formData.about}
                          onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                          placeholder={t("profile.profile")}
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">{t("profile.profile")}</h4>
                        <p className="text-foreground">{profile.artisanProfile.story}</p>
                      </div>
                      {profile.artisanProfile.about && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">{t("profile.profile")}</h4>
                          <p className="text-foreground">{profile.artisanProfile.about}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 bg-black hover:bg-gray-800"
                  >
                    <Save size={16} className="mr-2" />
                    {updateProfileMutation.isPending ? t("common.loading") : t("common.save")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateProfileMutation.isPending}
                    className="flex-1"
                  >
                    <X size={16} className="mr-2" />
                    {t("common.cancel")}
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleEdit}
                    variant="outline"
                    className="w-full"
                  >
                    <Edit size={16} className="mr-2" />
                    {t("profile.editProfile")}
                  </Button>
                  
                  {profile?.role === 'ARTISAN' && (
                    <Button
                      onClick={() => router.push('/dashboard')}
                      className="w-full bg-black hover:bg-gray-800"
                    >
                      <Settings size={16} className="mr-2" />
                      {t("navigation.dashboard")}
                    </Button>
                  )}
                </>
              )}
              
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full"
              >
                <LogOut size={16} className="mr-2" />
                {t("auth.signOut")}
              </Button>
            </div>

            {/* App Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("profile.profile")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t("profile.profile")}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      </div>
    </AuthGuard>
  )
}
