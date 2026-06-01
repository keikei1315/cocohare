import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

export async function GET(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ mood: null })

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('diary_entries')
    .select('mood_level')
    .eq('user_id', user.id)
    .eq('diary_date', date)
    .maybeSingle()

  return NextResponse.json({ mood: data?.mood_level ?? null })
}

export async function POST(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { date, mood } = await request.json()
  if (!date || !mood) return NextResponse.json({ error: 'Bad Request' }, { status: 400 })

  const adminClient = createAdminClient()

  const { data: existing } = await adminClient
    .from('diary_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('diary_date', date)
    .maybeSingle()

  if (existing) {
    await adminClient
      .from('diary_entries')
      .update({ mood_level: mood })
      .eq('id', existing.id)
  } else {
    await adminClient
      .from('diary_entries')
      .insert({ user_id: user.id, diary_date: date, mood_level: mood, content: '', positive_entries: [] })
  }

  return NextResponse.json({ ok: true })
}
