import { NextResponse } from 'next/server'
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
    .from('counseling_reports')
    .select('id, type, period, created_at')
    .eq('user_id', user.id)
    .order('period', { ascending: false })
    .limit(50)

  const weekly = (data ?? []).filter(r => r.type === 'weekly')
  const monthly = (data ?? []).filter(r => r.type === 'monthly')

  return NextResponse.json({ weekly, monthly })
}
