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

  // Fetch sentences (include audio_url so we don't clobber existing audio status)
  const { data: sentences, error } = await supabase
    .from('sentences')
    .select('id, source_text, audio_url')
    .in('id', sentence_ids)
    .eq('user_id', user.id)

  if (error || !sentences) {
    return NextResponse.json({ error: 'Failed to fetch sentences' }, { status: 500 })
  }

  // Translate + generate phonetic in one Claude call
  const sourceTexts = sentences.map(s => s.source_text).join('\n')

  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: `You are a professional translator. For each sentence translate it into ${target_language} and provide the phonetic pronunciation (e.g. Pinyin for Mandarin, Romaji for Japanese, transliteration for Arabic/Russian/Korean, IPA for others).

Output exactly two lines per input sentence:
Line 1: the translation in the target script
Line 2: the phonetic pronunciation using Latin characters
Then a blank line before the next sentence pair.

No numbering, no labels, no extra text. Natural, conversational phrasing.`,
      messages: [{ role: 'user', content: sourceTexts }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    console.error('Translation error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Parse pairs: translation\nphonetic\n\ntranslation\nphonetic...
  const blocks = (message.content[0] as { text: string }).text
    .split(/\n\s*\n/)
    .map(block => block.trim().split('\n').map(l => l.trim()).filter(Boolean))
    .filter(block => block.length >= 1)

  const updates = sentences.map((sentence, i) => {
    const block = blocks[i] ?? []
    const target_text = block[0] ?? null
    const phonetic_text = block[1] ?? null
    // Only reset audio_status to pending if there's no audio yet
    const extra = sentence.audio_url ? {} : { audio_status: 'pending' }
    return supabase
      .from('sentences')
      .update({ target_text, phonetic_text, ...extra })
      .eq('id', sentence.id)
  })

  await Promise.all(updates)

  return NextResponse.json({ translated: sentences.length })
}
