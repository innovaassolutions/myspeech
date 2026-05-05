import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const collectionId = searchParams.get('collection_id')

  const query = supabase
    .from('sentences')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (collectionId) query.eq('collection_id', collectionId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { collection_id, sentences } = await request.json()
  // sentences: string[] of source_text lines

  if (!collection_id || !sentences?.length) {
    return NextResponse.json({ error: 'Missing collection_id or sentences' }, { status: 400 })
  }

  const rows = sentences.map((text: string) => ({
    collection_id,
    user_id: user.id,
    source_text: text.trim(),
    audio_status: 'pending',
  }))

  const { data, error } = await supabase
    .from('sentences')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase
    .from('sentences')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
