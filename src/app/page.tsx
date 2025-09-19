import { VideoFeed } from "@/components/video-feed"
import { Navigation } from "@/components/navigation"
import { AuthGuard } from "@/components/auth-guard"

export default function Home() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="relative h-screen overflow-hidden bg-black">
        <Navigation />
        <VideoFeed />
      </div>
    </AuthGuard>
  );
}
