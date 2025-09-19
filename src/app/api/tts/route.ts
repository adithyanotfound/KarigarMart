import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@deepgram/sdk"

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Convert audio file to buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    // Get the file type (currently unused but may be needed for future enhancements)
    // const mimeType = audioFile.type || 'audio/wav'

    // Use Deepgram for speech-to-text transcription
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-3',
        detect_language: true,
        smart_format: true,
      }
    )

    if (error) {
      throw new Error(`Deepgram error: ${error.message}`)
    }

    const transcript = result.results.channels[0].alternatives[0].transcript

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in the audio file' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transcription: transcript.trim()
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}