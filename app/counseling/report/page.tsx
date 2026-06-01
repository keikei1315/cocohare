import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isMatsuPlan } from '@/lib/plan'
import ReportClient from './client'

export default async function ReportPage() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) redirect('/login')
  if (!isMatsuPlan(user!.user_metadata)) redirect('/subscription')

  const adminClient = createAdminClient()
  const { data: notes } = await adminClient
    .from('jibunn_notes')
    .select('id, type, input_concern, content, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <Suspense>
      <ReportClient initialNotes={notes ?? []} />
    </Suspense>
  )
}
