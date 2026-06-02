import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://personality.cocohare-life.com'

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
  const period = getPreviousMonthPeriod()

  // キャッシュ済みの場合は上書き（テスト用なのでforceで再生成）
  const { start, end } = getPreviousMonthBounds()

  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', userId).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find((d: { type: string }) => d.type === 'free')
  let typeName = ''
  if (freeDiag) {
    const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
    typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
  }

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

  if (!conversations?.length && !moodData.length) {
    return NextResponse.json({ ok: false, reason: 'no data', period, start, end })
  }

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

  await sendPushToUser(userId, {
    title: 'ぽとり',
    body: '先月の月間レポートができました🌸',
    url: `${SITE_URL}/counseling/chat`,
  }, adminClient)

  return NextResponse.json({ ok: true, period, start, end, conversations: conversations?.length ?? 0, moodDays: moodData.length })
}
