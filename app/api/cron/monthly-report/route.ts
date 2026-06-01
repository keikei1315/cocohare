import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Cron runs on the 1st → generate report for the PREVIOUS month
function getPreviousMonthPeriod() {
  const d = new Date()
  d.setDate(0) // last day of previous month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getPreviousMonthBounds() {
  const d = new Date()
  const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()
  const month = d.getMonth() === 0 ? 12 : d.getMonth()
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

async function generateMonthlyForUser(userId: string, adminClient: ReturnType<typeof createAdminClient>) {
  const period = getPreviousMonthPeriod()
  const { start, end } = getPreviousMonthBounds()

  const [{ data: moods }, { data: diaries }] = await Promise.all([
    adminClient.from('mood_records').select('mood_score, emotion_labels').eq('user_id', userId).gte('created_at', start).lte('created_at', end),
    adminClient.from('diary_entries').select('content, mood_level').eq('user_id', userId).gte('created_at', start).lte('created_at', end),
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
  const moodLevels = diaries?.map((d: { mood_level: string | null }) => d.mood_level).filter(Boolean) ?? []
  const goodDays = moodLevels.filter((m: string | null) => m === '良かった').length
  const badDays = moodLevels.filter((m: string | null) => m === '悪かった').length

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `あなたはCocoHareのAIカウンセラー「ぽとり」です。ユーザーの${period}の月間レポートを生成してください。
${typeName ? `性格タイプ：${typeName}` : ''}
気分記録: ${moods?.length ?? 0}件、平均スコア${avgMood ?? 'なし'}
日記: ${diaries?.length ?? 0}件（良かった${goodDays}日、悪かった${badDays}日）

JSON形式で返してください：
{"summary":"今月の全体的な振り返り(150-200文字)","emotionPattern":"感情の傾向と特徴(100-150文字)","growthPoints":["成長・気づきポイント1","成長・気づきポイント2","成長・気づきポイント3"],"challengeAreas":"課題や改善できそうな点(80-120文字)","nextMonthTheme":"来月のテーマひとこと(40-60文字)","insight":"ぽとりからのメッセージ(100-150文字)","avgMoodScore":${avgMood ?? 'null'},"moodCount":${moods?.length ?? 0},"diaryCount":${diaries?.length ?? 0},"goodDays":${goodDays},"badDays":${badDays}}`,
    }],
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const reportContent = JSON.parse(completion.choices[0].message.content ?? '{}')
  await adminClient.from('counseling_reports').upsert(
    { user_id: userId, type: 'monthly', period, content: reportContent },
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
    users.map(user => generateMonthlyForUser(user.id, adminClient))
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ ok: true, succeeded, failed, total: users.length })
}
