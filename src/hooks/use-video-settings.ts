"use client"

import { useVideoSettings as useVideoSettingsContext } from '@/components/providers/video-settings-provider'

export function useVideoSettings() {
  return useVideoSettingsContext()
}
