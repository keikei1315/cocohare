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
  const { data: payments } = await adminClient
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const userIds = [...new Set((payments ?? []).map((p: { user_id: string }) => p.user_id).filter(Boolean))]
  const { data: profiles } = userIds.length > 0
    ? await adminClient.from('profiles').select('id, email').in('id', userIds)
    : { data: [] }
  const emailMap: Record<string, string> = Object.fromEntries((profiles ?? []).map((p: { id: string; email: string }) => [p.id, p.email]))

  const list = (payments ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    email: p.user_id ? (emailMap[p.user_id as string] ?? null) : null,
  }))

  return NextResponse.json({ payments: list })
}
