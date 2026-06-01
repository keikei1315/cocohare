import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

async function generateForUser(userId: string, adminClient: ReturnType<typeof createAdminClient>) {
  const weekStart = getWeekStart()

  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', userId).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find((d: { type: string }) => d.type === 'free')
  let typeName = ''
  if (freeDiag) {
    const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
    typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
  }

  const { data: moods } = await adminClient
    .from('mood_records').select('mood_score').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)

  const { data: diaries } = await adminClient
    .from('diary_entries').select('content').eq('user_id', userId).order('created_at', { ascending: false }).limit(3)

  const moodContext = moods?.length ? `最近の気分スコア: ${moods.map((m: { mood_score: number }) => m.mood_score).join(', ')}（5段階）` : ''
  const diaryContext = diaries?.length ? `最近の日記:\n${diaries.map((d: { content: string }) => `- ${d.content.slice(0, 80)}`).join('\n')}` : ''

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `あなたはCocoHareのAIカウンセラー「ぽとり」です。ユーザーの今週のTODOを5つ生成してください。
${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}
${moodContext}
${diaryContext}
条件：心の健康・自分を大切にするための小さな行動。達成しやすく具体的。1つ15〜30文字。優しいトーン。
JSON形式: {"todos": ["内容1","内容2","内容3","内容4","内容5"]}`,
    }],
    max_tokens: 600,
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(completion.choices[0].message.content ?? '{"todos":[]}')
  const todoContents: string[] = parsed.todos ?? []

  await adminClient.from('jibunn_todos').delete().eq('user_id', userId).eq('week_start', weekStart)

  if (todoContents.length > 0) {
    await adminClient.from('jibunn_todos').insert(
      todoContents.map((content, i) => ({ user_id: userId, content, week_start: weekStart, completed: false, sort_order: i + 1 }))
    )
  }
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
    users.map(user => generateForUser(user.id, adminClient))
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ ok: true, succeeded, failed, total: users.length })
}
