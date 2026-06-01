import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

export async function GET(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const adminClient = createAdminClient()

  const saturdays: string[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === 6) {
      saturdays.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
  }

  const [{ data: diaries }, { data: moods }, { data: todoRows }] = await Promise.all([
    adminClient.from('diary_entries')
      .select('diary_date, positive_entries, mood_level, content, ai_content, created_at')
      .eq('user_id', user.id)
      .gte('diary_date', startDate)
      .lte('diary_date', endDate),
    adminClient.from('mood_records')
      .select('created_at, mood_score')
      .eq('user_id', user.id)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`),
    saturdays.length
      ? adminClient.from('jibunn_todos').select('week_start, completed').eq('user_id', user.id).in('week_start', saturdays)
      : Promise.resolve({ data: [] as { week_start: string; completed: boolean }[] }),
  ])

  const diaryDates = (diaries ?? [])
    .filter(d => (d.content && d.content.trim()) || (d.ai_content && d.ai_content.trim()))
    .map(d => d.diary_date).filter(Boolean)
  const positiveDates = (diaries ?? [])
    .filter(d => d.positive_entries && d.positive_entries.length > 0 && d.positive_entries.some((e: string) => e.trim()))
    .map(d => d.diary_date)
    .filter(Boolean)

  // mood_records の created_at を JST に変換して日付を取得
  const moodRecordDates = (moods ?? []).map(m => {
    const d = new Date(m.created_at)
    return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  // diary_entries の mood_level がある日付も含める（diary_date はローカル日付なのでそのまま使用）
  const diaryMoodDates = (diaries ?? []).filter(d => d.mood_level).map(d => d.diary_date).filter(Boolean)
  const moodDates = [...new Set([...moodRecordDates, ...diaryMoodDates])]

  const moodLevelByDate: Record<string, string> = {}
  diaries?.forEach(d => { if (d.diary_date && d.mood_level) moodLevelByDate[d.diary_date] = d.mood_level })

  const todoWeekData: Record<string, { completed: number; total: number }> = {}
  todoRows?.forEach(t => {
    if (!todoWeekData[t.week_start]) todoWeekData[t.week_start] = { completed: 0, total: 0 }
    todoWeekData[t.week_start].total++
    if (t.completed) todoWeekData[t.week_start].completed++
  })

  return NextResponse.json({
    diaryDates,
    positiveDates,
    moodDates: [...new Set(moodDates)],
    moodLevelByDate,
    todoWeekData,
  })
}
