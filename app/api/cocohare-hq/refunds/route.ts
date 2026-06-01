import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'abckeigo.1315@gmail.com'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: refunds } = await adminClient
    .from('refund_requests')
    .select('*')
    .order('created_at', { ascending: false })

  const userIds = [...new Set((refunds ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean))]
  const { data: profiles } = userIds.length > 0
    ? await adminClient.from('profiles').select('id, email').in('id', userIds)
    : { data: [] }
  const emailMap: Record<string, string> = Object.fromEntries((profiles ?? []).map((p: { id: string; email: string }) => [p.id, p.email]))

  const list = (refunds ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    email: emailMap[r.user_id as string] ?? null,
  }))

  return NextResponse.json({ refunds: list })
}
