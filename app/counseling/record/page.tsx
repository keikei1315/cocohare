import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'
import RecordClient from './client'

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export default async function RecordPage() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) redirect('/login')
  if (!isTakePlan(user!.user_metadata)) redirect('/subscription')

  const adminClient = createAdminClient()
  const weekStart = getWeekStart()

  const [
    { data: moods },
    { data: diaries },
    { data: todos },
  ] = await Promise.all([
    adminClient.from('mood_records')
      .select('id, mood_score, emotion_labels, note, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(30),
    adminClient.from('diary_entries')
      .select('id, content, ai_content, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),
    adminClient.from('jibunn_todos')
      .select('id, content, completed, sort_order')
      .eq('user_id', user!.id)
      .eq('week_start', weekStart)
      .order('sort_order', { ascending: true }),
  ])

  return (
    <Suspense>
      <RecordClient
        initialMoods={moods ?? []}
        initialDiaries={diaries ?? []}
        initialTodos={todos ?? []}
      />
    </Suspense>
  )
}
