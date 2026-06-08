import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import ChatClient from './client'

export default async function CounselingChatPage() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()

  // 未ログインはゲスト表示（ログインリダイレクトしない）
  if (!user) {
    return (
      <Suspense>
        <ChatClient
          initialMessages={[]}
          hasDiagnosis={false}
          isLoggedIn={false}
          isSubscribed={false}
          plan={null}
          hasHighTicket={false}
        />
      </Suspense>
    )
  }

  const adminClient = createAdminClient()

  const { data: history } = await adminClient
    .from('counseling_messages')
    .select('role, content, mode, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(40)

  const moodCheckDates = (history ?? [])
    .filter(m => m.mode === 'mood_check')
    .map(m => new Date(new Date(m.created_at).getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0])

  let moodByDate: Record<string, string> = {}
  if (moodCheckDates.length > 0) {
    const { data: diaryEntries } = await adminClient
      .from('diary_entries')
      .select('diary_date, mood_level')
      .eq('user_id', user.id)
      .in('diary_date', moodCheckDates)
    moodByDate = Object.fromEntries(
      (diaryEntries ?? []).map(e => [e.diary_date, e.mood_level ?? ''])
    )
  }

  const initialMessages = (history ?? []).reverse().map(m => {
    const isMoodCheck = m.mode === 'mood_check'
    const moodDate = isMoodCheck
      ? new Date(new Date(m.created_at).getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
      : undefined
    return {
      role: m.role as 'user' | 'assistant',
      content: m.content,
      mode: (isMoodCheck ? 'counseling' : m.mode) as 'counseling' | 'coaching',
      isMoodCheck,
      moodDate,
      moodSelected: moodDate ? (moodByDate[moodDate] || undefined) : undefined,
      created_at: m.created_at,
    }
  })

  const [{ data: diagnoses }, { data: htDiag }] = await Promise.all([
    adminClient.from('diagnoses').select('id').eq('user_id', user.id).limit(1),
    adminClient.from('diagnoses').select('id').eq('user_id', user.id).eq('type', 'high_ticket').limit(1).maybeSingle(),
  ])

  const hasDiagnosis = (diagnoses?.length ?? 0) > 0
  const isSubscribed = user?.user_metadata?.subscribed === true
  const plan = (user?.user_metadata?.plan as string) ?? null
  const hasHighTicket = !!htDiag

  return (
    <Suspense>
      <ChatClient
        initialMessages={initialMessages}
        hasDiagnosis={hasDiagnosis}
        isLoggedIn={true}
        isSubscribed={isSubscribed}
        plan={plan}
        hasHighTicket={hasHighTicket}
      />
    </Suspense>
  )
}
