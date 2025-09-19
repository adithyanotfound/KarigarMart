import { VideoFeed } from "@/components/video-feed"
import { Navigation } from "@/components/navigation"

export default function Home() {
  return (
    <div className="relative h-screen overflow-hidden bg-black">
      <Navigation />
      <VideoFeed />
    </div>
  );
}
