import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MOOD_SCORE: Record<string, number> = {
  '良かった': 5,
  '普通': 3,
  'しんどかったけど頑張った': 2,
  '悪かった': 1,
}

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
  const start = new Date(d)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString(), weekStart: start.toISOString().split('T')[0] }
}

export async function GET(request: Request) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const adminClient = createAdminClient()
    const period = searchParams.get('period') ?? getWeekPeriod()
    const readOnly = searchParams.get('period') !== null

    const { data: cached } = await adminClient
      .from('counseling_reports')
      .select('content')
      .eq('user_id', user.id)
      .eq('type', 'weekly')
      .eq('period', period)
      .maybeSingle()

    if (cached) return NextResponse.json({ report: cached.content, period, cached: true })
    if (readOnly) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const { start, end, weekStart } = getWeekBounds()
    const mondayDate = new Date(start)
    const prevSatDate = new Date(mondayDate)
    prevSatDate.setDate(mondayDate.getDate() - 2)
    const todoWeekStart = `${prevSatDate.getFullYear()}-${String(prevSatDate.getMonth() + 1).padStart(2, '0')}-${String(prevSatDate.getDate()).padStart(2, '0')}`

    const [{ data: conversations }, { data: diaries }, { data: todos }] = await Promise.all([
      adminClient.from('counseling_messages')
        .select('content, created_at')
        .eq('user_id', user.id)
        .eq('role', 'user')
        .neq('mode', 'mood_check')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true }),
      adminClient.from('diary_entries')
        .select('diary_date, mood_level')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true }),
      adminClient.from('jibunn_todos')
        .select('content, completed')
        .eq('user_id', user.id)
        .eq('week_start', todoWeekStart),
    ])

    const { data: diagnoses } = await adminClient
      .from('diagnoses').select('id, type').eq('user_id', user.id).order('created_at', { ascending: false })
    const freeDiag = diagnoses?.find(d => d.type === 'free')
    let typeName = ''
    if (freeDiag) {
      const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
      typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
    }

    const moodCounts: Record<string, number> = { '良かった': 0, '普通': 0, 'しんどかったけど頑張った': 0, '悪かった': 0 }
    const moodData: { date: string; score: number; label: string }[] = []
    diaries?.forEach(d => {
      if (d.mood_level && d.mood_level in moodCounts) {
        moodCounts[d.mood_level]++
        if (d.diary_date) {
          moodData.push({ date: d.diary_date, score: MOOD_SCORE[d.mood_level] ?? 3, label: d.mood_level })
        }
      }
    })
    moodData.sort((a, b) => a.date.localeCompare(b.date))

    if (!conversations?.length && !moodData.length) {
      return NextResponse.json({ error: 'Not enough data' }, { status: 422 })
    }

    const countsStr = Object.entries(moodCounts).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}日`).join('、') || 'なし'
    const convText = conversations?.length
      ? conversations.map(m => `・${m.content}`).join('\n')
      : '（今週の会話記録なし）'
    const completedCount = todos?.filter(t => t.completed).length ?? 0

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{
        role: 'user',
        content: `${period}の直近1週間のユーザー発言と気分集計をもとに、週次レポートを作成してください。
${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}
気分の集計: ${countsStr}
TODO: ${completedCount}/${todos?.length ?? 0}件完了

今週のユーザー発言:
${convText}

このレポートは、ユーザー自身があとから読み返し、
自分の考え方や感じ方の傾向に気づくための振り返り用レポートです。
評価・断定・説教は行わず、発言内容に基づいて丁寧に整理してください。
事実に基づき分析し、憶測や創作は禁止します。

【各項目の役割】
summary：今週全体の流れや特徴をまとめたレポートの概要。
core_values：ユーザーの発言から読み取れる、大切にしていそうな価値観や判断軸（3件）。
key_themes：今週繰り返し現れている関心・悩み・テーマ（3件）。
representative_quotes：ユーザーの発言をそのまま引用するのではなく、発言の背景にある価値観や考え方の傾向を言語化し、それがどのような生きづらさや、つまずきにつながっていそうかを分析した表現（3件）。
cautions：その思考や感情の偏りによって起こりやすい注意点や、無意識に陥りやすい考え方のクセ（3件）。
next_steps：上記の分析を踏まえ、次の週に意識すると負担が減りやすい視点や行動（3件）。

【重要な制約】
・ユーザーの発言をそのまま出力したり、表面的に言い換えることは禁止。
・「気にしない」「前向きに」「頑張ればいい」などの浅いアドバイスは禁止。
・ユーザーの人格や性格を断定する表現は禁止。
・「〜かもしれない」「〜の傾向がありそう」など、分析としての言語化に留めてください。

core_values・representative_quotes・cautions は、ユーザー自身が「そうかもしれない」と立ち止まって考えられるような、一段深い気づきにつながる表現を意識してください。

next_steps は、単なる励ましや抽象的な助言ではなく、「その瞬間にどう考えるか」「どう扱うか」が分かるレベルまで具体化してください。
たとえば、
・感情を受け止める場合は、どんな言葉で捉え直すか
・視点を変える場合は、何と何を切り分けて考えるか
・意識してみる場合は、どんな問いを自分に向けるか
など、次の週に実際に試せる「思考のワンステップ」として表現してください。

JSONのみ返してください:
{"summary":"","core_values":["","",""],"key_themes":["","",""],"representative_quotes":["","",""],"cautions":["","",""],"next_steps":["","",""]}`,
      }],
    })

    let aiContent: Record<string, unknown> = {}
    try {
      const raw = completion.choices[0].message.content ?? ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      aiContent = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')
    } catch { /* fallback */ }
    const reportContent = { ...aiContent, moodData, todo_completed: completedCount, todo_total: todos?.length ?? 0 }

    await adminClient.from('counseling_reports').upsert(
      { user_id: user.id, type: 'weekly', period, content: reportContent },
      { onConflict: 'user_id,type,period' }
    )

    const newSatDate = new Date(prevSatDate)
    newSatDate.setDate(prevSatDate.getDate() + 7)
    const newTodoWeekStart = `${newSatDate.getFullYear()}-${String(newSatDate.getMonth() + 1).padStart(2, '0')}-${String(newSatDate.getDate()).padStart(2, '0')}`

    const todoCompletion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{
        role: 'user',
        content: `ユーザーの来週の「じぶんTODO」を5つ生成してください。
じぶんTODOとは、自分を大切にするための、来週やってみる小さなことです。

${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}
今週のテーマ（振り返り）: ${((aiContent as { key_themes?: string[] }).key_themes ?? []).join('、')}

【生成の考え方】
・今週のテーマから、来週このユーザーが意識するとよいことを読み取って生成する
・「心の健康」「自分を労る」「小さな喜び」「モヤモヤの解消」などの視点で考える
・来週実際に試せる「行動のワンステップ」にする
  悪い例：「散歩をする」「早く寝る」「気分転換する」（抽象的・一般的すぎる）
  良い例：「帰り道に1駅分だけ歩いてみる」「スマホを置いて10分だけ横になる」（具体的・小さい）
・5つはそれぞれ違う角度・テーマになるようにする（同じような行動を重複させない）
・一般的なWellnessアドバイスや精神論は禁止
・1つ15〜30文字程度。「〜してみる」「〜を試してみる」など、やわらかいトーンで

JSONのみ返してください:
{"todos": ["", "", "", "", ""]}`,
      }],
    })
    let parsedTodos: { todos?: string[] } = { todos: [] }
    try {
      const raw = todoCompletion.choices[0].message.content ?? ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsedTodos = JSON.parse(jsonMatch ? jsonMatch[0] : '{"todos":[]}')
    } catch { /* fallback */ }
    const todoContents: string[] = parsedTodos.todos ?? []

    await adminClient.from('jibunn_todos').delete().eq('user_id', user.id).eq('week_start', todoWeekStart)
    if (todoContents.length) {
      await adminClient.from('jibunn_todos').insert(
        todoContents.map((content, i) => ({
          user_id: user.id, content, week_start: newTodoWeekStart, completed: false, sort_order: i + 1,
        }))
      )
    }

    const achieveRate = todos?.length ? Math.round(completedCount / todos.length * 100) : 0

    await adminClient.from('counseling_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: `先週のTODO達成率は${achieveRate}%でした🎯\n今週のTODOを5つ用意しました📝\n[週間レポートを見る](/counseling/diary/reports/weekly/${period})`,
      mode: 'counseling',
    })

    return NextResponse.json({ report: reportContent, period, cached: false })
  } catch (err) {
    console.error('[weekly-report error]', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
