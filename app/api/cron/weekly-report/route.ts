import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { createAdminClient } from '@/lib/supabase/admin'


function getWeekPeriod(date = new Date()) {
  const d = new Date(date)
  const year = d.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

function getWeekBounds(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(d); start.setDate(diff); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString(), weekStart: start.toISOString().split('T')[0] }
}

async function generateWeeklyForUser(userId: string, adminClient: ReturnType<typeof createAdminClient>) {
  const period = getWeekPeriod()
  const { start, end, weekStart } = getWeekBounds()

  const [{ data: moods }, { data: diaries }, { data: todos }] = await Promise.all([
    adminClient.from('mood_records').select('mood_score, emotion_labels, note').eq('user_id', userId).gte('created_at', start).lte('created_at', end),
    adminClient.from('diary_entries').select('content').eq('user_id', userId).gte('created_at', start).lte('created_at', end),
    adminClient.from('jibunn_todos').select('content, completed').eq('user_id', userId).eq('week_start', weekStart),
  ])

  if (!moods?.length && !diaries?.length) return

  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', userId).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find((d: { type: string }) => d.type === 'free')
  let typeName = ''
  if (freeDiag) {
    const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
    typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
  }

  const avgMood = moods?.length ? (moods.reduce((s: number, m: { mood_score: number }) => s + m.mood_score, 0) / moods.length).toFixed(1) : null
  const completedCount = todos?.filter((t: { completed: boolean }) => t.completed).length ?? 0

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `あなたはCocoHareのAIカウンセラー「ぽとり」です。ユーザーの今週（${period}）のウィークリーレポートを生成してください。
${typeName ? `性格タイプ：${typeName}` : ''}
気分記録: ${moods?.length ?? 0}件、平均スコア${avgMood ?? 'なし'}
日記: ${diaries?.length ?? 0}件
TODO: ${completedCount}/${todos?.length ?? 0}件完了

JSON形式で返してください：
{"summary":"今週の振り返り(100-150文字)","moodAnalysis":"気分の傾向(80-120文字)","highlights":["よかったこと1","よかったこと2"],"insight":"気づきひとこと(80-120文字)","nextWeekSuggestion":"来週へのアドバイス(80-100文字)","avgMoodScore":${avgMood ?? 'null'},"moodCount":${moods?.length ?? 0},"diaryCount":${diaries?.length ?? 0},"todoCompletedCount":${completedCount},"todoTotalCount":${todos?.length ?? 0}}`,
    }],
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  })

  const reportContent = JSON.parse(completion.choices[0].message.content ?? '{}')
  await adminClient.from('counseling_reports').upsert(
    { user_id: userId, type: 'weekly', period, content: reportContent },
    { onConflict: 'user_id,type,period' }
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = await Promise.allSettled(
    users.map(user => generateWeeklyForUser(user.id, adminClient))
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ ok: true, succeeded, failed, total: users.length })
}
