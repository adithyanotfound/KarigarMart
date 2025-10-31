import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@deepgram/sdk"

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: 'Missing DEEPGRAM_API_KEY' },
        { status: 500 }
      )
    }
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
    let result: any
    try {
      const response = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-3',
          detect_language: true,
          smart_format: true,
          // Provide mimetype hint to avoid mis-parsing on the server
          mimetype: (audioFile as File).type || 'audio/wav',
        }
      )
      result = response.result
    } catch (dgErr: any) {
      const message = dgErr?.message || 'Deepgram transcription failed'
      return NextResponse.json(
        { error: message },
        { status: 502 }
      )
    }

    const transcript = (result as any)?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""

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