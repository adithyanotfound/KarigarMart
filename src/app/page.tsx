"use client"

import { useState } from "react"
import { VideoFeed } from "@/components/video-feed"
import { Navigation } from "@/components/navigation"
import { AuthGuard } from "@/components/auth-guard"

export default function Home() {
  const [isVideoPaused, setIsVideoPaused] = useState(false)

  return (
    <AuthGuard requireAuth={true}>
      <div className="relative h-screen overflow-hidden bg-black">
        <Navigation isHidden={isVideoPaused} />
        <VideoFeed onPauseChange={setIsVideoPaused} />
      </div>
    </AuthGuard>
  );
}
