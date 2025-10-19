"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface VideoSettingsContextType {
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  volume: number
  setVolume: (volume: number) => void
  hasUserInteracted: boolean
  setHasUserInteracted: (interacted: boolean) => void
}

const VideoSettingsContext = createContext<VideoSettingsContextType | undefined>(undefined)

interface VideoSettingsProviderProps {
  children: ReactNode
}

export function VideoSettingsProvider({ children }: VideoSettingsProviderProps) {
  const [isMuted, setIsMutedState] = useState(true)
  const [volume, setVolumeState] = useState(1)
  const [hasUserInteracted, setHasUserInteractedState] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMuteSetting = localStorage.getItem('videoMuted')
      if (savedMuteSetting !== null) {
        setIsMutedState(JSON.parse(savedMuteSetting))
      }

      const savedVolumeSetting = localStorage.getItem('videoVolume')
      if (savedVolumeSetting !== null) {
        const parsedVolume = JSON.parse(savedVolumeSetting)
        setVolumeState(parsedVolume)
        if(parsedVolume === 0) {
            setIsMutedState(true)
        }
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
  
  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume)
    if (newVolume > 0) {
      setIsMuted(false)
    } else {
      setIsMuted(true)
    }
    if (typeof window !== 'undefined') {
        localStorage.setItem('videoVolume', JSON.stringify(newVolume));
    }
  };

  const setHasUserInteracted = (interacted: boolean) => {
    setHasUserInteractedState(interacted)
  }

  return (
    <VideoSettingsContext.Provider value={{ 
      isMuted, 
      setIsMuted, 
      volume,
      setVolume,
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
