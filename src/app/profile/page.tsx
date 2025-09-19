"use client"

import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ArrowLeft, User, Mail, Calendar, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth-guard"

async function fetchUserProfile() {
  const response = await fetch('/api/user/profile')
  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }
  return response.json()
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-profile'],
    queryFn: fetchUserProfile,
    enabled: !!session,
  })


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
            Back
          </Button>
          <h1 className="font-semibold text-foreground">Profile</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading profile...</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500">Error loading profile</div>
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
                <CardTitle className="text-xl">{profile?.name}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-2">
                  <Badge 
                    variant={profile?.role === 'ARTISAN' ? 'default' : 'secondary'}
                    className={profile?.role === 'ARTISAN' ? 'bg-black text-white' : ''}
                  >
                    {profile?.role === 'ARTISAN' ? 'Artisan' : 'Customer'}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{profile?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="text-foreground">
                    Joined {new Date(profile?.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Artisan Profile */}
            {profile?.role === 'ARTISAN' && profile?.artisanProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Story</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{profile.artisanProfile.story}</p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {profile?.role === 'ARTISAN' && (
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-black hover:bg-gray-800"
                >
                  <Settings size={16} className="mr-2" />
                  Go to Dashboard
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </Button>
            </div>

            {/* App Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About KarigarMart</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  A social marketplace for discovering and purchasing unique artisan products 
                  through short-form video content. Connect with talented artisans and discover 
                  their amazing handcrafted products.
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
