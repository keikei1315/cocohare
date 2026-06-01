import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'abckeigo.1315@gmail.com'

function safe<T>(p: Promise<{ data: T | null; count?: number | null; error: unknown }>, fallback: T) {
  return Promise.race([
    p.then(r => ({ data: r.data ?? fallback, count: r.count ?? 0 })).catch(() => ({ data: fallback, count: 0 })),
    new Promise<{ data: T; count: number }>(res => setTimeout(() => res({ data: fallback, count: 0 }), 8000)),
  ])
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const [
    { count: userCount },
    { data: payments },
    { data: activeSubs },
    { data: refunds },
    { count: freeDiagCount },
    { count: otherPerspCount },
  ] = await Promise.all([
    safe(adminClient.from('profiles').select('*', { count: 'exact', head: true }) as never, []),
    safe(adminClient.from('payments').select('amount, status, created_at, user_id').order('created_at', { ascending: false }) as never, []),
    safe(adminClient.from('subscriptions').select('id').eq('status', 'active') as never, []),
    safe(adminClient.from('refund_requests').select('id') as never, []),
    safe(adminClient.from('diagnoses').select('*', { count: 'exact', head: true }).eq('type', 'free') as never, []),
    safe(adminClient.from('other_perspective_answers').select('*', { count: 'exact', head: true }) as never, []),
  ])

  const paymentsArr = (payments as { amount: number; status: string; created_at: string; user_id: string }[]) ?? []
  const completed = paymentsArr.filter(p => p.status === 'completed')
  const totalRevenue = completed.reduce((s, p) => s + p.amount, 0)
  const paidDiagCount = completed.filter(p => p.amount === 1480).length
  const highTicketCount = completed.filter(p => p.amount === 8320).length
  const activeSubCount = (activeSubs as unknown[])?.length ?? 0
  const base = freeDiagCount ?? 0

  const recentPayments = paymentsArr.slice(0, 10)
  const userIds = [...new Set(recentPayments.map(p => p.user_id).filter(Boolean))]
  const { data: profiles } = userIds.length > 0
    ? await adminClient.from('profiles').select('id, email').in('id', userIds)
    : { data: [] }
  const emailMap: Record<string, string> = Object.fromEntries((profiles ?? []).map((p: { id: string; email: string }) => [p.id, p.email]))

  return NextResponse.json({
    userCount: userCount ?? 0,
    totalRevenue,
    activeSubCount,
    refundCount: (refunds as unknown[])?.length ?? 0,
    freeDiagCount: base,
    otherPerspCount: otherPerspCount ?? 0,
    paidDiagCount,
    highTicketCount,
    recentPayments: recentPayments.map(p => ({ ...p, email: emailMap[p.user_id] ?? null })),
  })
}
