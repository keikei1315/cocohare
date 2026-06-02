import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser, sendPushToAll } from '@/lib/push'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://personality.cocohare-life.com'


// ── helpers ──────────────────────────────────────────────────────────────────

function getJSTDate(utcNow = new Date()) {
  const jst = new Date(utcNow.getTime() + 9 * 60 * 60 * 1000)
  return jst
}

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
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
  return { start: start.toISOString(), end: end.toISOString(), weekStart: start.toISOString().split('T')[0] }
}

function getPreviousMonthPeriod() {
  const d = new Date()
  d.setDate(0)
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

async function getUserTypeName(userId: string, adminClient: ReturnType<typeof createAdminClient>) {
  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', userId).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find((d: { type: string }) => d.type === 'free')
  if (!freeDiag) return ''
  const { data: rep } = await adminClient
    .from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
  return (rep?.content as { typeName?: string })?.typeName ?? ''
}


const MOOD_SCORE: Record<string, number> = {
  '良かった': 5, '普通': 3, 'しんどかったけど頑張った': 2, '悪かった': 1,
}

// ── weekly report ────────────────────────────────────────────────────────────

async function generateWeeklyForUser(userId: string, adminClient: ReturnType<typeof createAdminClient>) {
  const jst = getJSTDate()
  const period = getWeekPeriod(jst)

  const { data: cached } = await adminClient
    .from('counseling_reports').select('id')
    .eq('user_id', userId).eq('type', 'weekly').eq('period', period).maybeSingle()
  if (cached) return

  const { start, end } = getWeekBounds(jst)
  const typeName = await getUserTypeName(userId, adminClient)

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

  if (!conversations?.length && !moodData.length) return

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

  // 来週のtodo生成
  const newSatDate = new Date(prevSatDate)
  newSatDate.setUTCDate(prevSatDate.getUTCDate() + 7)
  const newTodoWeekStart = `${newSatDate.getUTCFullYear()}-${String(newSatDate.getUTCMonth() + 1).padStart(2, '0')}-${String(newSatDate.getUTCDate()).padStart(2, '0')}`

  const todoCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `あなたはCocoHareのAIカウンセラー「ぽとり」です。ユーザーの今週のじぶんTODOを5つ生成してください。\n${typeName ? `ユーザーの性格タイプ：${typeName}\n` : ''}今週のテーマ: ${((aiContent as { key_themes?: string[] }).key_themes ?? []).join('、')}\n\n条件：心の健康・自分を大切にするための小さな行動。達成しやすく具体的。1つ15〜30文字。優しいトーン。\nJSON: {"todos": ["内容1","内容2","内容3","内容4","内容5"]}`,
    }],
    max_tokens: 600,
    response_format: { type: 'json_object' },
  })
  const parsedTodos = JSON.parse(todoCompletion.choices[0].message.content ?? '{"todos":[]}')
  const todoContents: string[] = (parsedTodos as { todos?: string[] }).todos ?? []

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
}

// ── monthly report ───────────────────────────────────────────────────────────

async function generateMonthlyForUser(userId: string, adminClient: ReturnType<typeof createAdminClient>) {
  const period = getPreviousMonthPeriod()

  const { data: cached } = await adminClient
    .from('counseling_reports').select('id')
    .eq('user_id', userId).eq('type', 'monthly').eq('period', period).maybeSingle()
  if (cached) return

  const { start, end } = getPreviousMonthBounds()
  const typeName = await getUserTypeName(userId, adminClient)

  const [{ data: conversations }, { data: diaries }, { data: weeklyReports }] = await Promise.all([
    adminClient.from('counseling_messages')
      .select('content, created_at').eq('user_id', userId).eq('role', 'user').neq('mode', 'mood_check')
      .gte('created_at', start).lte('created_at', end).order('created_at', { ascending: true }).limit(50),
    adminClient.from('diary_entries')
      .select('diary_date, mood_level').eq('user_id', userId)
      .gte('created_at', start).lte('created_at', end).order('created_at', { ascending: true }),
    adminClient.from('counseling_reports')
      .select('content, period').eq('user_id', userId).eq('type', 'weekly')
      .gte('created_at', start).lte('created_at', end).order('created_at', { ascending: true }),
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

  if (!conversations?.length && !moodData.length) return

  const countsStr = Object.entries(moodCounts).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}日`).join('、') || 'なし'
  const convText = conversations?.length ? conversations.map(m => `・${m.content}`).join('\n') : '（今月の会話記録なし）'
  const weekSummaries = weeklyReports?.length
    ? weeklyReports.map(r => `${r.period}: ${(r.content as { summary?: string })?.summary ?? ''}`).join('\n')
    : 'なし'

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `あなたはメンタルヘルス領域の月次分析レポート作成者です。
会話・気分記録・週次レポートを統合し、「反応の型」「深層心理」「回復の再現条件」を短く記述してください。

${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}
気分の集計: ${countsStr}
今月の会話発言数: ${conversations?.length ?? 0}件

今月の発言:
${convText}

今月の週次レポートサマリー:
${weekSummaries}

【共通ルール】出力はJSONのみ。医療診断・断定は禁止。引用の羅列禁止。「外的要因」と「内的要因」を必ず分ける。精神論・一般論を避け、実行場面が見える表現で書く。

summary（120字以内）：月全体の"心の動きの核"を1文で要約。
mood_pattern（3件、各60〜90字）：気分変動の中核パターン。
reaction_loops（2件、各90〜130字）：代表的な反応連鎖。
core_values（3件、各60〜90字）：本人が守りたい価値観・譲れない基準。
hidden_needs（3件、各60〜90字）：言葉の裏にある心理的欲求。
core_beliefs_hypothesis（3件、各45〜75字）：繰り返し現れる自己ルール/前提（仮説）。
mood_down_trigger（3件、各60〜90字）：低下要因を「外的トリガー＋内的増幅因子」で。
mood_up_trigger（3件、各60〜90字）：回復要因を「安心条件＋回復機序」で。
protective_assets（3件、各60〜90字）：既に持っている回復資源。
early_warning_signs（3件、各35〜60字）：気分低下前の早期サイン。
next_month_theme（80字以内）：翌月の重点テーマを1本化。
next_actions（3件、各45〜70字）：極小アクション（いつ/どこで/何を）。
if_then_plans（3件、各50〜80字）：If-Then形式。
uncertainty_guard（70字以内）：解釈の限界を1文で明示。

JSONのみ返してください:
{"summary":"","mood_pattern":["","",""],"reaction_loops":["",""],"core_values":["","",""],"hidden_needs":["","",""],"core_beliefs_hypothesis":["","",""],"mood_down_trigger":["","",""],"mood_up_trigger":["","",""],"protective_assets":["","",""],"early_warning_signs":["","",""],"next_month_theme":"","next_actions":["","",""],"if_then_plans":["","",""],"uncertainty_guard":""}`,
    }],
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  })

  const aiContent = JSON.parse(completion.choices[0].message.content ?? '{}')
  const reportContent = { ...aiContent, moodData }

  await adminClient.from('counseling_reports').upsert(
    { user_id: userId, type: 'monthly', period, content: reportContent },
    { onConflict: 'user_id,type,period' }
  )

  await adminClient.from('counseling_messages').insert({
    user_id: userId,
    role: 'assistant',
    content: `先月の月間レポートができました🌸\n[月間レポートを見る](/counseling/diary/reports/monthly/${period})`,
    mode: 'counseling',
  })
}

// ── main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const jst = getJSTDate()
  const dayOfWeek = jst.getDay() // 0=Sun, 6=Sat
  const dayOfMonth = jst.getDate()

  const tasks: Record<string, { succeeded: number; failed: number }> = {}

  // Always: mood check notification + insert mood check message for each user
  await sendPushToAll(
    { title: 'ぽとり', body: '今日の気分はどうでしたか？記録してみましょう🌙', url: `${SITE_URL}/counseling/chat` },
    adminClient
  )

  const todayJST = jst.toISOString().split('T')[0]
  const [y, m, d] = todayJST.split('-').map(Number)
  const todayStartUTC = new Date(Date.UTC(y, m - 1, d) - 9 * 60 * 60 * 1000).toISOString()
  const todayEndUTC = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 9 * 60 * 60 * 1000).toISOString()

  const moodResults = await Promise.allSettled(
    users.map(async (user) => {
      // 今日すでに送信済みならスキップ（limit(1)でmaybeSingle重複バグを回避）
      const { data: existingChecks } = await adminClient
        .from('counseling_messages')
        .select('id')
        .eq('user_id', user.id)
        .eq('mode', 'mood_check')
        .gte('created_at', todayStartUTC)
        .lte('created_at', todayEndUTC)
        .limit(1)
      if (existingChecks && existingChecks.length > 0) return

      // 今日すでに気分記録済みならスキップ
      const { data: todayMood } = await adminClient
        .from('diary_entries')
        .select('mood_level')
        .eq('user_id', user.id)
        .eq('diary_date', todayJST)
        .maybeSingle()
      if (todayMood?.mood_level) return

      await adminClient.from('counseling_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: '今日もお疲れ様でした🌙\n今日の気分はどうでしたか？',
        mode: 'mood_check',
      })
    })
  )
  tasks.moodNotification = {
    succeeded: moodResults.filter(r => r.status === 'fulfilled').length,
    failed: moodResults.filter(r => r.status === 'rejected').length,
  }

  // Saturday (JST): generate weekly reports + notify
  if (dayOfWeek === 6) {
    const results = await Promise.allSettled(
      users.map(async (user) => {
        await generateWeeklyForUser(user.id, adminClient)
        await sendPushToUser(user.id, { title: 'ぽとり', body: '今週のウィークリーレポートができました📊', url: `${SITE_URL}/counseling/diary/reports` }, adminClient)
      })
    )
    tasks.weeklyReport = {
      succeeded: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    }
  }

  // 1st of month (JST): generate monthly reports + notify
  if (dayOfMonth === 1) {
    const results = await Promise.allSettled(
      users.map(async (user) => {
        await generateMonthlyForUser(user.id, adminClient)
        await sendPushToUser(user.id, { title: 'ぽとり', body: '先月の月間レポートができました🌸', url: `${SITE_URL}/counseling/diary/reports` }, adminClient)
      })
    )
    tasks.monthlyReport = {
      succeeded: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    }
  }

  return NextResponse.json({ ok: true, jstDay: dayOfWeek, jstDate: dayOfMonth, tasks })
}
