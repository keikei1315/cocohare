import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY ?? '').replace(/^﻿/, ''))
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://personality.cocohare-life.com'

function getJSTDate(utcNow = new Date()) {
  return new Date(utcNow.getTime() + 9 * 60 * 60 * 1000)
}

function getWeekPeriod(date = new Date()) {
  const year = date.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const weekNum = Math.ceil(
    ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  )
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

function getWeekBounds(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(d); start.setDate(diff); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

const MOOD_SCORE: Record<string, number> = {
  '良かった': 5, '普通': 3, 'しんどかったけど頑張った': 2, '悪かった': 1,
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = new URL(request.url).searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const adminClient = createAdminClient()
  const jst = getJSTDate()
  const period = getWeekPeriod(jst)
  const { start, end } = getWeekBounds(jst)

  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', userId).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find((d: { type: string }) => d.type === 'free')
  let typeName = ''
  if (freeDiag) {
    const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
    typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
  }

  const mondayDate = new Date(start)
  const prevSatDate = new Date(mondayDate)
  prevSatDate.setUTCDate(mondayDate.getUTCDate() - 2)
  const todoWeekStart = `${prevSatDate.getUTCFullYear()}-${String(prevSatDate.getUTCMonth() + 1).padStart(2, '0')}-${String(prevSatDate.getUTCDate()).padStart(2, '0')}`

  const [{ data: conversations }, { data: diaries }, { data: todos }] = await Promise.all([
    adminClient.from('counseling_messages')
      .select('content, created_at').eq('user_id', userId).eq('role', 'user').neq('mode', 'mood_check')
      .gte('created_at', start).lte('created_at', end).order('created_at', { ascending: true }),
    adminClient.from('diary_entries')
      .select('diary_date, mood_level').eq('user_id', userId)
      .gte('created_at', start).lte('created_at', end).order('created_at', { ascending: true }),
    adminClient.from('jibunn_todos')
      .select('content, completed').eq('user_id', userId).eq('week_start', todoWeekStart),
  ])

  const moodCounts: Record<string, number> = { '良かった': 0, '普通': 0, 'しんどかったけど頑張った': 0, '悪かった': 0 }
  const moodData: { date: string; score: number; label: string }[] = []
  diaries?.forEach(d => {
    if (d.mood_level && d.mood_level in moodCounts) {
      moodCounts[d.mood_level]++
      if (d.diary_date) moodData.push({ date: d.diary_date, score: MOOD_SCORE[d.mood_level] ?? 3, label: d.mood_level })
    }
  })
  moodData.sort((a, b) => a.date.localeCompare(b.date))

  const countsStr = Object.entries(moodCounts).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}日`).join('、') || 'なし'
  const convText = conversations?.length ? conversations.map(m => `・${m.content}`).join('\n') : '（今週の会話記録なし）'
  const completedCount = todos?.filter((t: { completed: boolean }) => t.completed).length ?? 0

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `${period}の直近1週間のユーザー発言と気分集計をもとに、週次レポートを作成してください。
${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}
気分の集計: ${countsStr}
TODO: ${completedCount}/${todos?.length ?? 0}件完了

今週のユーザー発言:
${convText}

このレポートは、ユーザー自身があとから読み返し、自分の考え方や感じ方の傾向に気づくための振り返り用レポートです。
評価・断定・説教は行わず、発言内容に基づいて丁寧に整理してください。事実に基づき分析し、憶測や創作は禁止します。

summary：今週全体の流れや特徴をまとめたレポートの概要。
core_values：ユーザーの発言から読み取れる、大切にしていそうな価値観や判断軸（3件）。
key_themes：今週繰り返し現れている関心・悩み・テーマ（3件）。
representative_quotes：発言の背景にある価値観や考え方の傾向を言語化し、生きづらさや、つまずきにつながっていそうかを分析した表現（3件）。
cautions：思考や感情の偏りによって起こりやすい注意点（3件）。
next_steps：次の週に意識すると負担が減りやすい視点や行動（3件）。

JSONのみ返してください:
{"summary":"","core_values":["","",""],"key_themes":["","",""],"representative_quotes":["","",""],"cautions":["","",""],"next_steps":["","",""]}`,
    }],
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const aiContent = JSON.parse(completion.choices[0].message.content ?? '{}')
  const reportContent = { ...aiContent, moodData, todo_completed: completedCount, todo_total: todos?.length ?? 0 }

  await adminClient.from('counseling_reports').upsert(
    { user_id: userId, type: 'weekly', period, content: reportContent },
    { onConflict: 'user_id,type,period' }
  )

  // 来週のTODO生成
  const newSatDate = new Date(prevSatDate)
  newSatDate.setUTCDate(prevSatDate.getUTCDate() + 7)
  const newTodoWeekStart = `${newSatDate.getUTCFullYear()}-${String(newSatDate.getUTCMonth() + 1).padStart(2, '0')}-${String(newSatDate.getUTCDate()).padStart(2, '0')}`

  const [{ data: todoMoods }, { data: todoDiaries }] = await Promise.all([
    adminClient.from('mood_records').select('mood_score, emotion_labels').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    adminClient.from('diary_entries').select('content').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
  ])
  const moodCtx = todoMoods?.length ? `最近の気分スコア: ${todoMoods.map((m: { mood_score: number }) => m.mood_score).join(', ')}（5段階）` : ''
  const diaryCtx = todoDiaries?.length ? `最近の日記:\n${todoDiaries.map((d: { content: string }) => `- ${d.content.slice(0, 100)}`).join('\n')}` : ''

  const todoModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
  const todoResult = await todoModel.generateContent(`ユーザーの今週の「じぶんTODO」を5つ生成してください。
じぶんTODOとは、自分を大切にするための、今週やってみる小さなことです。

${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}
${moodCtx}
${diaryCtx}

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

  let parsedTodos: { todos?: string[] } = { todos: [] }
  try {
    const raw = todoResult.response.text()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsedTodos = JSON.parse(jsonMatch ? jsonMatch[0] : '{"todos":[]}')
  } catch (e) {
    console.error('[test-weekly-report] todo parse error:', e)
  }
  const todoContents: string[] = parsedTodos.todos ?? []

  await adminClient.from('jibunn_todos').delete().eq('user_id', userId).eq('week_start', todoWeekStart)
  if (todoContents.length) {
    await adminClient.from('jibunn_todos').insert(
      todoContents.map((content, i) => ({ user_id: userId, content, week_start: newTodoWeekStart, completed: false, sort_order: i + 1 }))
    )
  }

  const achieveRate = todos?.length ? Math.round(completedCount / todos.length * 100) : 0
  await adminClient.from('counseling_messages').insert({
    user_id: userId,
    role: 'assistant',
    content: `先週のTODO達成率は${achieveRate}%でした🎯\n今週のTODOを5つ用意しました📝\n[週間レポートを見る](/counseling/diary/reports/weekly/${period})`,
    mode: 'counseling',
  })

  await sendPushToUser(userId, {
    title: 'ぽとり',
    body: `先週のTODO達成率は${achieveRate}%でした🎯 今週のTODOと週間レポートが届いています📊`,
    url: `${SITE_URL}/counseling/chat`,
  }, adminClient)

  return NextResponse.json({ ok: true, period, achieveRate, todoWeekStart, newTodoWeekStart })
}
