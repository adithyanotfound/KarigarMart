"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle, Mic, Play, Square, Trash2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AuthGuard } from "@/components/auth-guard"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export default function OnboardingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    story: "",
    about: ""
  })

  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isTranscribingAbout, setIsTranscribingAbout] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingStartTime = useRef<number | null>(null)

  // Story audio recording state
  const [isStoryRecording, setIsStoryRecording] = useState(false)
  const [isStoryPlaying, setIsStoryPlaying] = useState(false)
  const [storyAudioBlob, setStoryAudioBlob] = useState<Blob | null>(null)
  const [storyAudioUrl, setStoryAudioUrl] = useState<string | null>(null)
  const [storyRecordingDuration, setStoryRecordingDuration] = useState(0)
  const [isTranscribingStory, setIsTranscribingStory] = useState(false)
  const storyMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const storyAudioRef = useRef<HTMLAudioElement | null>(null)
  const storyRecordingStartTime = useRef<number | null>(null)

  const totalSteps = 4

  // Check if artisan has already completed onboarding
  const { data: onboardingStatus } = useQuery({
    queryKey: ['artisan-onboarding-status'],
    queryFn: async () => {
      const response = await fetch('/api/artisan/onboarding/status')
      if (!response.ok) {
        throw new Error('Failed to check onboarding status')
      }
      return response.json()
    },
    enabled: !!session && session.user.role === 'ARTISAN',
  })

  // Redirect if already completed onboarding
  useEffect(() => {
    if (session?.user.role === 'ARTISAN' && onboardingStatus?.hasCompletedOnboarding) {
      router.push('/dashboard')
    }
  }, [session, onboardingStatus, router])

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const audioChunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        setAudioBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
        toast.success("Recording completed!")
        
        // Immediately transcribe the audio
        setIsTranscribingAbout(true)
        try {
          const transcription = await processAudioToText(audioBlob)
          if (transcription.trim()) {
            setFormData(prev => ({ ...prev, about: transcription }))
            toast.success("Audio transcribed and added to text field!")
          } else {
            toast.info("No speech detected in the recording.")
          }
        } catch (error) {
          console.error('Transcription error:', error)
          toast.error("No speech detected in the recording. Failed to transcribe audio.")
        } finally {
          setIsTranscribingAbout(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      recordingStartTime.current = Date.now()
      setRecordingDuration(0)
      toast.info("Recording started...")
    } catch (error) {
      toast.error("Could not access microphone. Please check permissions.")
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingStartTime.current) {
        const duration = Math.round((Date.now() - recordingStartTime.current) / 1000)
        setRecordingDuration(duration)
      }
    }
  }

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const deleteAudio = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingDuration(0)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    toast.success("Audio recording deleted")
  }

  const reRecordAudio = () => {
    deleteAudio() // Clear current audio
    // The user can then start recording again
    toast.info("Ready to record again. Click 'Start Recording' when ready.")
  }

  // Story audio recording functions
  const startStoryRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      storyMediaRecorderRef.current = mediaRecorder

      const audioChunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        setStoryAudioBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setStoryAudioUrl(url)
        stream.getTracks().forEach(track => track.stop())
        toast.success("Story recording completed!")
        
        // Immediately transcribe the audio
        setIsTranscribingStory(true)
        try {
          const transcription = await processAudioToText(audioBlob)
          if (transcription.trim()) {
            setFormData(prev => ({ ...prev, story: transcription }))
            toast.success("Story audio transcribed and added to text field!")
          } else {
            toast.info("No speech detected in the story recording.")
          }
        } catch (error) {
          console.error('Story transcription error:', error)
          toast.error("Failed to transcribe story audio. You can still type manually.")
        } finally {
          setIsTranscribingStory(false)
        }
      }

      mediaRecorder.start()
      setIsStoryRecording(true)
      storyRecordingStartTime.current = Date.now()
      setStoryRecordingDuration(0)
      toast.info("Story recording started...")
    } catch (error) {
      toast.error("Could not access microphone. Please check permissions.")
      console.error('Error accessing microphone:', error)
    }
  }

  const stopStoryRecording = async () => {
    if (storyMediaRecorderRef.current && isStoryRecording) {
      storyMediaRecorderRef.current.stop()
      setIsStoryRecording(false)
      if (storyRecordingStartTime.current) {
        const duration = Math.round((Date.now() - storyRecordingStartTime.current) / 1000)
        setStoryRecordingDuration(duration)
      }
    }
  }

  const playStoryAudio = () => {
    if (storyAudioUrl && storyAudioRef.current) {
      storyAudioRef.current.play()
      setIsStoryPlaying(true)
    }
  }

  const stopStoryAudio = () => {
    if (storyAudioRef.current) {
      storyAudioRef.current.pause()
      storyAudioRef.current.currentTime = 0
      setIsStoryPlaying(false)
    }
  }

  const handleStoryAudioEnded = () => {
    setIsStoryPlaying(false)
  }

  const deleteStoryAudio = () => {
    setStoryAudioBlob(null)
    setStoryAudioUrl(null)
    setStoryRecordingDuration(0)
    setIsStoryPlaying(false)
    if (storyAudioRef.current) {
      storyAudioRef.current.pause()
      storyAudioRef.current.currentTime = 0
    }
    toast.success("Story audio recording deleted")
  }

  const reRecordStoryAudio = () => {
    deleteStoryAudio() // Clear current audio
    // The user can then start recording again
    toast.info("Ready to record story again. Click 'Start Recording' when ready.")
  }

  const processAudioToText = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.wav')

    const response = await fetch('/api/tts', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      const message = (errorData?.error as string) || 'Failed to transcribe audio'
      // Gracefully handle no-speech case by returning empty string
      if (response.status === 400 && /no speech detected/i.test(message)) {
        toast.info("No speech detected in the recording. Try speaking closer to the mic.")
        return ""
      }
      // Surface known upstream errors without crashing the flow
      if (response.status === 502) {
        toast.error(message)
        return ""
      }
      throw new Error(message)
    }

    const data = await response.json()
    return data.transcription
  }

  const generateSummary = async (text: string): Promise<string> => {
    const response = await fetch('/api/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate summary')
    }

    const data = await response.json()
    return data.summary
  }

  const handleSubmit = async () => {
    if (!formData.story.trim() && !storyAudioBlob) {
      setError("Please tell us your story or record an audio message")
      toast.error("Please tell us your story or record an audio message")
      return
    }

    if (!formData.about.trim() && !audioBlob) {
      setError("Please tell us about yourself or record an audio message")
      toast.error("Please tell us about yourself or record an audio message")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      let finalAbout = formData.about
      let finalStory = formData.story

      // Use the text from formData (which now includes transcribed audio)
      finalAbout = formData.about

      // Use the text from formData (which now includes transcribed audio)
      finalStory = formData.story

      // If we have text (either from input or audio), generate summary for about
      if (finalAbout.trim()) {
        try {
          toast.info("Generating professional summary for about section...")
          const summary = await generateSummary(finalAbout)
          if (summary.trim()) {
            finalAbout = summary
            toast.success("Professional summary generated for about section!")
          }
        } catch (summaryError) {
          console.error('Summary generation error:', summaryError)
          toast.error("Failed to generate summary. Using original text.")
          // Continue with original text if summary generation fails
        }
      }

      // If we have text (either from input or audio), generate summary for story
      if (finalStory.trim()) {
        try {
          toast.info("Generating professional summary for story section...")
          const summary = await generateSummary(finalStory)
          if (summary.trim()) {
            finalStory = summary
            toast.success("Professional summary generated for story section!")
          }
        } catch (summaryError) {
          console.error('Story summary generation error:', summaryError)
          toast.error("Failed to generate story summary. Using original text.")
          // Continue with original text if summary generation fails
        }
      }

      const response = await fetch('/api/artisan/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story: finalStory,
          about: finalAbout
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to complete onboarding')
        toast.error(data.error || 'Failed to complete onboarding')
        return
      }

      toast.success("Profile created successfully!")
      
      // Invalidate the onboarding status query cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['artisan-onboarding-status'] })
      
      // Move to success step
      setCurrentStep(totalSteps + 1)
      
      // Redirect to dashboard after 1.5 seconds (shorter delay for better UX)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch {
      setError("An error occurred. Please try again.")
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const progressPercentage = (currentStep / totalSteps) * 100

  // Check if user is an artisan
  if (session && session.user.role !== 'ARTISAN') {
    router.push('/')
    return null
  }

  // Show loading while checking onboarding status
  if (session?.user.role === 'ARTISAN' && onboardingStatus === undefined) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="text-foreground mb-2">Loading...</div>
            <div className="text-sm text-muted-foreground">Checking your profile status</div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (currentStep > totalSteps) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <CheckCircle size={80} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to KarigarMart!</h1>
            <p className="text-muted-foreground mb-4">Your profile has been created successfully.</p>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
          </motion.div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Complete Your Artisan Profile</CardTitle>
            <CardDescription>
              Step {currentStep} of {totalSteps}
            </CardDescription>
            <Progress value={progressPercentage} className="mt-4" />
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center space-y-4"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  Welcome, {session?.user.name}!
                </h3>
                <p className="text-muted-foreground">
                  We&apos;re excited to have you join our community of talented artisans. Let&apos;s set up your profile so customers can discover your amazing work.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">What you&apos;ll get:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>• Your own dashboard to manage products</li>
                    <li>• Video-first product showcase</li>
                    <li>• Direct connection with customers</li>
                    <li>• Secure payment processing</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Step 2: Basic Info */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  Confirm Your Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      This is how customers will see your name. Contact support if you need to change this.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: About */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  Tell Us About Yourself
                </h3>
                <p className="text-muted-foreground">
                  Share a bit about yourself, your background, and what drives your passion for creating.
                </p>
                <div className="space-y-4">              
                  <div className="space-y-3">
                    <Label>Audio Recording (Recommended)</Label>
                    <p className="text-sm text-muted-foreground">
                      Record an audio message to tell your story in your own voice. This will be automatically transcribed and added to the text field below.
                    </p>
                    
                    <div className="space-y-3">
                      {/* Recording Controls */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {!isRecording ? (
                          <Button
                            type="button"
                            variant={audioBlob ? "secondary" : "outline"}
                            onClick={startRecording}
                            disabled={isLoading || isTranscribingAbout}
                            className={`flex items-center gap-2 ${audioBlob ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : ""}`}
                          >
                            <Mic size={16} />
                            {audioBlob ? "Record Again" : "Start Recording"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={stopRecording}
                            disabled={isLoading || isTranscribingAbout}
                            className="flex items-center gap-2"
                          >
                            <Square size={16} />
                            Stop Recording
                          </Button>
                        )}
                        
                        {audioUrl && (
                          <div className="flex items-center gap-2">
                            {!isPlaying ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={playAudio}
                                disabled={isLoading || isTranscribingAbout}
                                className="flex items-center gap-2"
                              >
                                <Play size={14} />
                                Play
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={stopAudio}
                                disabled={isLoading || isTranscribingAbout}
                                className="flex items-center gap-2"
                              >
                                <Square size={14} />
                                Stop
                              </Button>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {isRecording ? "Recording..." : isTranscribingAbout ? "Transcribing..." : `Audio recorded (${recordingDuration}s)`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Audio Management Controls */}
                      {audioUrl && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
                            <CheckCircle size={16} />
                            <span>Audio recording completed ({recordingDuration}s)</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={reRecordAudio}
                              disabled={isLoading || isRecording}
                              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw size={14} />
                              Re-record
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={deleteAudio}
                              disabled={isLoading || isRecording}
                              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {audioUrl && (
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={handleAudioEnded}
                        className="hidden"
                      />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="about">Or Type Your Story (Alternative)</Label>
                    <Textarea
                      id="about"
                      value={formData.about}
                      onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                      placeholder="I am... My background is... I&apos;m passionate about..."
                      className="min-h-[120px]"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {audioBlob ? "Audio has been transcribed above. You can edit this text or delete the audio to start over." : "This text will be professionally rephrased before saving."}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Story */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  Tell Your Story
                </h3>
                <p className="text-muted-foreground">
                  Share your journey as an artisan. What inspired you to create? What makes your work special?
                </p>
                <div className="space-y-4">              
                  <div className="space-y-3">
                    <Label>Audio Recording (Recommended)</Label>
                    <p className="text-sm text-muted-foreground">
                      Record an audio message to tell your story in your own voice. This will be automatically transcribed and added to the text field below.
                    </p>
                    
                    <div className="space-y-3">
                      {/* Recording Controls */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {!isStoryRecording ? (
                          <Button
                            type="button"
                            variant={storyAudioBlob ? "secondary" : "outline"}
                            onClick={startStoryRecording}
                            disabled={isLoading || isTranscribingStory}
                            className={`flex items-center gap-2 ${storyAudioBlob ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : ""}`}
                          >
                            <Mic size={16} />
                            {storyAudioBlob ? "Record Again" : "Start Recording"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={stopStoryRecording}
                            disabled={isLoading || isTranscribingStory}
                            className="flex items-center gap-2"
                          >
                            <Square size={16} />
                            Stop Recording
                          </Button>
                        )}
                        
                        {storyAudioUrl && (
                          <div className="flex items-center gap-2">
                            {!isStoryPlaying ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={playStoryAudio}
                                disabled={isLoading || isTranscribingStory}
                                className="flex items-center gap-2"
                              >
                                <Play size={14} />
                                Play
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={stopStoryAudio}
                                disabled={isLoading || isTranscribingStory}
                                className="flex items-center gap-2"
                              >
                                <Square size={14} />
                                Stop
                              </Button>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {isStoryRecording ? "Recording..." : isTranscribingStory ? "Transcribing..." : `Audio recorded (${storyRecordingDuration}s)`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Audio Management Controls */}
                      {storyAudioUrl && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
                            <CheckCircle size={16} />
                            <span>Story audio recording completed ({storyRecordingDuration}s)</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={reRecordStoryAudio}
                              disabled={isLoading || isStoryRecording}
                              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw size={14} />
                              Re-record
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={deleteStoryAudio}
                              disabled={isLoading || isStoryRecording}
                              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {storyAudioUrl && (
                      <audio
                        ref={storyAudioRef}
                        src={storyAudioUrl}
                        onEnded={handleStoryAudioEnded}
                        className="hidden"
                      />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="story">Or Type Your Story (Alternative)</Label>
                    <Textarea
                      id="story"
                      value={formData.story}
                      onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                      placeholder="I&apos;ve been crafting for... My inspiration comes from... What makes my work unique is..."
                      className="min-h-[120px]"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      {storyAudioBlob ? "Story audio has been transcribed above. You can edit this text or delete the audio to start over." : "This will be displayed on your products to help customers connect with your work."}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isLoading}
              >
                Back
              </Button>
              
              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  className="bg-black hover:bg-gray-800"
                  disabled={isLoading}
                >
                  Next
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-black hover:bg-gray-800"
                  disabled={isLoading || (!formData.story.trim() && !storyAudioBlob) || (!formData.about.trim() && !audioBlob)}
                >
                  {isLoading ? "Processing..." : "Complete Setup"}
                </Button>
              )}
            </div>
        </CardContent>
      </Card>
      </motion.div>
      </div>
    </AuthGuard>
  )
}
