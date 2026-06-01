import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'
import ReportListClient from './client'

export default async function ReportListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isTakePlan(user.user_metadata)) redirect('/subscription')
  return <Suspense><ReportListClient /></Suspense>
}
