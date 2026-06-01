import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTakePlan } from '@/lib/plan'
import WeeklyReportPage from './client'

export default async function WeeklyReportDetailPage({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isTakePlan(user.user_metadata)) redirect('/subscription')

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('counseling_reports')
    .select('content')
    .eq('user_id', user.id)
    .eq('type', 'weekly')
    .eq('period', period)
    .maybeSingle()

  return <WeeklyReportPage period={period} report={data?.content ?? null} />
}
