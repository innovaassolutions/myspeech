import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sentence_ids, target_language } = await request.json()

  if (!sentence_ids?.length || !target_language) {
    return NextResponse.json({ error: 'Missing sentence_ids or target_language' }, { status: 400 })
  }

  // Fetch sentences
  const { data: sentences, error } = await supabase
    .from('sentences')
    .select('id, source_text')
    .in('id', sentence_ids)
    .eq('user_id', user.id)

  if (error || !sentences) {
    return NextResponse.json({ error: 'Failed to fetch sentences' }, { status: 500 })
  }

  // Translate all sentences in a single Claude call for efficiency
  const sourceTexts = sentences.map(s => s.source_text).join('\n')

  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: `You are a professional translator. Translate each sentence into ${target_language}.
Output ONLY the translations, one per line, in the same order as the input.
No numbering, no explanations, no extra text. Natural, conversational phrasing.`,
      messages: [{ role: 'user', content: sourceTexts }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    console.error('Translation error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const translations = (message.content[0] as { text: string }).text
    .split('\n')
    .filter(line => line.trim())

  // Update each sentence with its translation
  const updates = sentences.map((sentence, i) =>
    supabase
      .from('sentences')
      .update({ target_text: translations[i], audio_status: 'pending' })
      .eq('id', sentence.id)
  )

  await Promise.all(updates)

  return NextResponse.json({ translated: sentences.length })
}
