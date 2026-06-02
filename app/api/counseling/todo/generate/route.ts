import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY ?? '').replace(/^﻿/, ''))


function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const daysToSaturday = day === 6 ? 0 : day + 1
  d.setDate(d.getDate() - daysToSaturday)
  return d.toISOString().split('T')[0]
}

export async function POST() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const adminClient = createAdminClient()
  const weekStart = getWeekStart()

  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', user.id).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find(d => d.type === 'free')
  let typeName = ''
  if (freeDiag) {
    const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
    typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
  }

  const { data: moods } = await adminClient
    .from('mood_records')
    .select('mood_score, emotion_labels')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: diaries } = await adminClient
    .from('diary_entries')
    .select('content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const moodContext = moods?.length
    ? `最近の気分スコア: ${moods.map(m => m.mood_score).join(', ')}（5段階）`
    : ''
  const diaryContext = diaries?.length
    ? `最近の日記:\n${diaries.map(d => `- ${d.content.slice(0, 100)}`).join('\n')}`
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
    console.log('[todo/generate] raw response:', raw.slice(0, 300))
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{"todos":[]}')
  } catch (e) {
    console.error('[todo/generate] parse error:', e)
  }
  const todoContents: string[] = parsed.todos ?? []

  if (todoContents.length === 0) {
    return NextResponse.json({ error: 'AIの応答からTODOを取得できませんでした' }, { status: 500 })
  }

  await adminClient
    .from('jibunn_todos')
    .delete()
    .eq('user_id', user.id)
    .eq('week_start', weekStart)

  const inserts = todoContents.map((content, i) => ({
    user_id: user.id,
    content,
    week_start: weekStart,
    completed: false,
    sort_order: i + 1,
  }))

  const { data, error } = await adminClient
    .from('jibunn_todos')
    .insert(inserts)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ todos: data })
}
