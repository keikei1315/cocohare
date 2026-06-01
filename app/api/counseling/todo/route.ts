import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const daysToSaturday = day === 6 ? 0 : day + 1
  d.setDate(d.getDate() - daysToSaturday)
  return d.toISOString().split('T')[0]
}

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const weekStart = getWeekStart()
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('jibunn_todos')
    .select('id, content, completed, sort_order, week_start, created_at')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: true })

  return NextResponse.json({ todos: data ?? [], weekStart })
}

export async function POST(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { content, week_start } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const weekStart = week_start ?? getWeekStart()
  const adminClient = createAdminClient()

  const { data: existing } = await adminClient
    .from('jibunn_todos')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = (existing?.sort_order ?? 0) + 1

  const { data, error } = await adminClient
    .from('jibunn_todos')
    .insert({ user_id: user.id, content: content.trim(), week_start: weekStart, completed: false, sort_order: sortOrder })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ todo: data })
}
