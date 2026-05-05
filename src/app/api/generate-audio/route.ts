import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { createClient } from '@/lib/supabase/server'

const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sentence_id } = await request.json()

  if (!sentence_id) {
    return NextResponse.json({ error: 'Missing sentence_id' }, { status: 400 })
  }

  // Fetch sentence and its collection (for voice_id)
  const { data: sentence, error } = await supabase
    .from('sentences')
    .select('*, collections(voice_id, target_language)')
    .eq('id', sentence_id)
    .eq('user_id', user.id)
    .single()

  if (error || !sentence) {
    return NextResponse.json({ error: 'Sentence not found' }, { status: 404 })
  }

  if (!sentence.target_text) {
    return NextResponse.json({ error: 'Sentence not yet translated' }, { status: 400 })
  }

  // Mark as generating
  await supabase
    .from('sentences')
    .update({ audio_status: 'generating' })
    .eq('id', sentence_id)

  try {
    const voiceId = sentence.collections?.voice_id
    if (!voiceId) throw new Error('No voice ID configured for this collection')

    // Generate audio via ElevenLabs
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: sentence.target_text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    })

    // Collect stream into buffer
    const chunks: Buffer[] = []
    const reader = (audioStream as unknown as ReadableStream<Uint8Array>).getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(Buffer.from(value))
    }
    const audioBuffer = Buffer.concat(chunks)

    // Upload to Supabase Storage
    const filePath = `${user.id}/${sentence_id}.mp3`
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(filePath)

    // Update sentence with audio URL
    await supabase
      .from('sentences')
      .update({ audio_url: publicUrl, audio_status: 'ready' })
      .eq('id', sentence_id)

    return NextResponse.json({ audio_url: publicUrl })
  } catch (err) {
    await supabase
      .from('sentences')
      .update({ audio_status: 'error' })
      .eq('id', sentence_id)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Audio generation failed' },
      { status: 500 }
    )
  }
}
