import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createAdminClient } from '@/lib/supabase/admin'

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY ?? '').replace(/^﻿/, ''))


// 実行時刻: 15:00 UTC = 00:00 JST
// 「昨日JST」の UTC 範囲を返す
function getYesterdayJSTBounds() {
  const now = new Date()
  const jstMidnight = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const jstYesterday = new Date(jstMidnight)
  jstYesterday.setUTCDate(jstYesterday.getUTCDate() - 1)
  const [y, m, d] = jstYesterday.toISOString().split('T')[0].split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d) - 9 * 60 * 60 * 1000)
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 9 * 60 * 60 * 1000)
  const noon = new Date(Date.UTC(y, m - 1, d, 12) - 9 * 60 * 60 * 1000)
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return { start: start.toISOString(), end: end.toISOString(), noon: noon.toISOString(), dateStr }
}

async function generateDiaryForUser(userId: string, adminClient: ReturnType<typeof createAdminClient>) {
  const { start, end, noon, dateStr } = getYesterdayJSTBounds()

  // 既に当日の日記があればスキップ
  const { data: existing } = await adminClient
    .from('diary_entries')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
    .limit(1)
  if (existing?.length) return

  // 昨日の会話を取得
  const { data: messages } = await adminClient
    .from('counseling_messages')
    .select('role, content')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true })
  if (!messages?.length) return

  // 性格タイプ取得
  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', userId).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find((d: { type: string }) => d.type === 'free')
  let typeName = ''
  if (freeDiag) {
    const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
    typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
  }

  const conversationText = messages
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'あなた' : 'ぽとり'}：${m.content}`)
    .join('\n')

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
  const result = await model.generateContent(`あなたはCocoHareのAIカウンセラー「ぽとり」です。
${dateStr}のぽとりとの会話をもとに、日記を生成してください。

${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}

会話：
${conversationText}

条件：
- 「今日は〜」という一人称の語りかけ形式
- ユーザーが話した内容・気持ちをもとに日記らしくまとめる
- 100〜200文字
- 自然な日記調

日記本文のみ返してください。`)

  const aiContent = result.response.text().trim()
  if (!aiContent) return

  await adminClient.from('diary_entries').insert({
    user_id: userId,
    content: '',
    ai_content: aiContent,
    created_at: noon,
  })
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
    users.map(user => generateDiaryForUser(user.id, adminClient))
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  return NextResponse.json({ ok: true, succeeded, failed, total: users.length })
}
