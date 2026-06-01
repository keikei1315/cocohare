import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isMatsuPlan } from '@/lib/plan'
import { resolveNoteLimit } from '@/lib/resolve-note-limit'
import JibunnNoteClient from './client'

export default async function JibunnNotePage() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const [{ data: notes }, { data: htDiag }] = await Promise.all([
    adminClient
      .from('jibunn_notes')
      .select('id, type, input_concern, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    adminClient
      .from('diagnoses')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'high_ticket')
      .limit(1)
      .maybeSingle(),
  ])

  if (!isMatsuPlan(user.user_metadata) && !htDiag) redirect('/subscription')

  const initialNotes = notes ?? []
  const { limit: initialLimit, useMonthlyReset: initialUseMonthlyReset } =
    resolveNoteLimit(user.user_metadata as Record<string, unknown>, !!htDiag)
  const initialNoteCredits = (user.user_metadata as Record<string, unknown>)?.note_credits as number ?? 0

  return (
    <Suspense>
      <JibunnNoteClient
        initialNotes={initialNotes}
        initialLimit={initialLimit}
        initialUseMonthlyReset={initialUseMonthlyReset}
        initialNoteCredits={initialNoteCredits}
      />
    </Suspense>
  )
}
