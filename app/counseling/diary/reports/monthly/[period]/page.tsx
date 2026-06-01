import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isMatsuPlan } from '@/lib/plan'
import MonthlyReportPage from './client'

export default async function MonthlyReportDetailPage({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isMatsuPlan(user.user_metadata)) redirect('/subscription')

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('counseling_reports')
    .select('content')
    .eq('user_id', user.id)
    .eq('type', 'monthly')
    .eq('period', period)
    .maybeSingle()

  return <MonthlyReportPage period={period} report={data?.content ?? null} />
}
