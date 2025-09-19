"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface VideoSettingsContextType {
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  hasUserInteracted: boolean
  setHasUserInteracted: (interacted: boolean) => void
}

const VideoSettingsContext = createContext<VideoSettingsContextType | undefined>(undefined)

interface VideoSettingsProviderProps {
  children: ReactNode
}

export function VideoSettingsProvider({ children }: VideoSettingsProviderProps) {
  const [isMuted, setIsMutedState] = useState(true)
  const [hasUserInteracted, setHasUserInteractedState] = useState(false)

  // Load mute setting from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMuteSetting = localStorage.getItem('videoMuted')
      if (savedMuteSetting !== null) {
        setIsMutedState(JSON.parse(savedMuteSetting))
      }
    }
  }, [])

  // Track user interaction globally
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteractedState(true)
      // Remove event listeners after first interaction
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)
    document.addEventListener('keydown', handleUserInteraction)

    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }
  }, [])

  // Save mute setting to localStorage when it changes
  const setIsMuted = (muted: boolean) => {
    setIsMutedState(muted)
    if (typeof window !== 'undefined') {
      localStorage.setItem('videoMuted', JSON.stringify(muted))
    }
  }

  const setHasUserInteracted = (interacted: boolean) => {
    setHasUserInteractedState(interacted)
  }

  return (
    <VideoSettingsContext.Provider value={{ 
      isMuted, 
      setIsMuted, 
      hasUserInteracted, 
      setHasUserInteracted 
    }}>
      {children}
    </VideoSettingsContext.Provider>
  )
}

export function useVideoSettings() {
  const context = useContext(VideoSettingsContext)
  if (context === undefined) {
    throw new Error('useVideoSettings must be used within a VideoSettingsProvider')
  }
  return context
}
