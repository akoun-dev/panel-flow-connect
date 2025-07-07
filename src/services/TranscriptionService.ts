import { logger } from '@/lib/logger'

const TranscriptionService = {
  async transcribeAudio(audio: Blob): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('VITE_OPENAI_API_KEY is missing')
    }

    const formData = new FormData()
    formData.append('file', audio, 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('language', 'fr')

    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Transcription failed', errorText)
      throw new Error(errorText)
    }

    const data = await response.json()
    return data.text as string
  }
}

export default TranscriptionService
