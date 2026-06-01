import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('mood_records')
    .select('id, mood_score, emotion_labels, note, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ records: data ?? [] })
}

export async function POST(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { mood_score, emotion_labels, note } = await request.json()
  if (!mood_score || mood_score < 1 || mood_score > 5) {
    return NextResponse.json({ error: 'Invalid mood_score' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('mood_records')
    .insert({ user_id: user.id, mood_score, emotion_labels: emotion_labels ?? [], note: note ?? '' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ record: data })
}
