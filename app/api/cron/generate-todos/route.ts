import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY ?? '').replace(/^﻿/, ''))
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://personality.cocohare-life.com'


function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const daysToSaturday = day === 6 ? 0 : day + 1
  d.setDate(d.getDate() - daysToSaturday)
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
    .from('mood_records')
    .select('mood_score, emotion_labels')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: diaries } = await adminClient
    .from('diary_entries')
    .select('content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  const moodContext = moods?.length
    ? `最近の気分スコア: ${moods.map((m: { mood_score: number }) => m.mood_score).join(', ')}（5段階）`
    : ''
  const diaryContext = diaries?.length
    ? `最近の日記:\n${diaries.map((d: { content: string }) => `- ${d.content.slice(0, 100)}`).join('\n')}`
    : ''

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
  const result = await model.generateContent(`ユーザーの今週の「じぶんTODO」を5つ生成してください。
じぶんTODOとは、自分を大切にするための、今週やってみる小さなことです。

${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}
${moodContext}
${diaryContext}

【生成の考え方】
・最近の気分と日記の内容から、今のこのユーザーに必要なことを読み取って生成する
・「心の健康」「自分を労る」「小さな喜び」「モヤモヤの解消」などの視点で考える
・今週実際に試せる「行動のワンステップ」にする
  悪い例：「散歩をする」「早く寝る」「栄養を摂る」（抽象的・一般的すぎる）
  良い例：「帰り道に1駅分だけ歩いてみる」「スマホを置いて10分だけ横になる」（具体的・小さい）
・5つはそれぞれ違う角度・テーマになるようにする（同じような行動を重複させない）
・一般的なWellnessアドバイスや精神論は禁止
・1つ15〜30文字程度。「〜してみる」「〜を試してみる」など、やわらかいトーンで

JSONのみ返してください:
{"todos": ["", "", "", "", ""]}`)

  let parsed: { todos?: string[] } = { todos: [] }
  try {
    const raw = result.response.text()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{"todos":[]}')
  } catch (e) {
    console.error('[generate-todos] parse error:', e)
  }
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

  const targetUserId = new URL(request.url).searchParams.get('user_id')
  const targetUsers = targetUserId ? users.filter(u => u.id === targetUserId) : users

  const results = await Promise.allSettled(
    targetUsers.map(async (user) => {
      await generateForUser(user.id, adminClient)
      await sendPushToUser(user.id, { title: 'ぽとり', body: '今週のTODOを更新しました！チェックしてみてね🐰', url: `${SITE_URL}/counseling/chat` }, adminClient)
    })
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ ok: true, succeeded, failed, total: users.length })
}
