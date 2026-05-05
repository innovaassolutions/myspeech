import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Fixes sentences where audio_url is set but audio_status is not 'ready'
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { collection_id } = await request.json()

  const query = supabase
    .from('sentences')
    .update({ audio_status: 'ready' })
    .eq('user_id', user.id)
    .not('audio_url', 'is', null)
    .neq('audio_status', 'ready')

  if (collection_id) query.eq('collection_id', collection_id)

  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
