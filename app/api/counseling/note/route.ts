import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { anthropic, extractJSON } from '@/lib/anthropic'

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const [{ data }, { data: htDiagGet }] = await Promise.all([
    adminClient
      .from('jibunn_notes')
      .select('id, type, input_concern, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    adminClient
      .from('diagnoses')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'high_ticket')
      .limit(1)
      .maybeSingle(),
  ])

  const { limit, useMonthlyReset } = resolveNoteLimit(user.user_metadata, !!htDiagGet)
  const noteCredits = (user.user_metadata?.note_credits as number) ?? 0

  return NextResponse.json({ notes: data ?? [], limit, use_monthly_reset: useMonthlyReset, note_credits: noteCredits })
}

export async function POST(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { input_concern, input_situation, generateAi } = await request.json()
  if (!input_concern?.trim()) return NextResponse.json({ error: 'input_concern required' }, { status: 400 })

  const adminClient = createAdminClient()

  // Access check: 松サブスク OR 高額診断購入済み
  const isMatsu = user.user_metadata?.subscribed === true && user.user_metadata?.plan === 'matsu'
  const { data: htDiag } = await adminClient
    .from('diagnoses')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'high_ticket')
    .limit(1)
    .maybeSingle()
  const hasHighTicket = !!htDiag

  if (!isMatsu && !hasHighTicket) {
    return NextResponse.json({ error: 'access_denied' }, { status: 403 })
  }

  // Determine limit and reset policy
  const { limit, useMonthlyReset } = resolveNoteLimit(user.user_metadata, hasHighTicket)

  // Count existing notes
  const jstOffsetMs = 9 * 60 * 60 * 1000
  let countQuery = adminClient
    .from('jibunn_notes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if (useMonthlyReset) {
    const jstNow = new Date(Date.now() + jstOffsetMs)
    const startOfMonthUTC = new Date(
      Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), 1) - jstOffsetMs
    )
    countQuery = countQuery.gte('created_at', startOfMonthUTC.toISOString())
  }
  const { count: noteCount } = await countQuery
  const noteCredits = (user.user_metadata?.note_credits as number) ?? 0
  const overLimit = (noteCount ?? 0) >= limit

  if (overLimit && noteCredits <= 0) {
    return NextResponse.json({ error: 'limit_reached', limit, can_purchase: true }, { status: 429 })
  }

  // Get personality type
  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', user.id).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find((d: { id: string; type: string }) => d.type === 'free')
  let typeName = ''
  if (freeDiag) {
    const { data: rep } = await adminClient
      .from('reports').select('content')
      .eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
    typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
  }

  // Get recent weekly reports as context
  const { data: recentReports } = await adminClient
    .from('counseling_reports')
    .select('type, period, content')
    .eq('user_id', user.id)
    .eq('type', 'weekly')
    .order('created_at', { ascending: false })
    .limit(2)

  const weeklyContext = (recentReports ?? [])
    .map((r: { type: string; period: string; content: unknown }) => {
      const c = r.content as {
        overview?: string; mood_summary?: string; themes?: string[]
        emotional_pattern?: string; key_events?: string[]
      } | null
      if (!c) return null
      const parts: string[] = []
      if (c.overview) parts.push(`概要: ${c.overview}`)
      if (c.mood_summary) parts.push(`感情: ${c.mood_summary}`)
      if (c.emotional_pattern) parts.push(`パターン: ${c.emotional_pattern}`)
      if (c.themes?.length) parts.push(`テーマ: ${c.themes.join('、')}`)
      if (c.key_events?.length) parts.push(`出来事: ${c.key_events.slice(0, 2).join(' / ')}`)
      return parts.length ? `[${r.period}週] ${parts.join(' ／ ')}` : null
    })
    .filter(Boolean)
    .join('\n')

  let content: string = input_concern.trim()

  if (generateAi) {
    const prompt = buildPrompt(
      input_concern.trim(),
      input_situation?.trim() ?? '',
      weeklyContext,
      typeName,
    )

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4500,
      temperature: 0.85,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = extractJSON(completion.content[0].type === 'text' ? completion.content[0].text : '')
    try {
      const parsed = JSON.parse(raw)
      if (parsed.title && parsed.lead && Array.isArray(parsed.sections) && parsed.closing) {
        content = raw
      }
    } catch {
      // fallback: store as plain text
      content = raw || input_concern.trim()
    }
  }

  const { data, error } = await adminClient
    .from('jibunn_notes')
    .insert({
      user_id: user.id,
      type: 'normal',
      input_concern: input_concern.trim(),
      input_situation: input_situation?.trim() ?? '',
      conversation: null,
      content,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (overLimit && noteCredits > 0) {
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { note_credits: noteCredits - 1 },
    })
  }

  return NextResponse.json({ note: data })
}

function resolveNoteLimit(
  userMeta: Record<string, unknown> | null | undefined,
  hasHighTicket?: boolean,
): { limit: number; useMonthlyReset: boolean } {
  const isMatsu = userMeta?.subscribed === true && userMeta?.plan === 'matsu'
  const ht = hasHighTicket ?? false
  if (isMatsu && ht) return { limit: 5, useMonthlyReset: true }
  if (isMatsu) return { limit: 3, useMonthlyReset: true }
  return { limit: 3, useMonthlyReset: false }
}

function buildPrompt(
  concern: string,
  inputSituation: string,
  weeklyContext: string,
  typeName: string,
): string {
  return `あなたはCocoHareのAIカウンセラー「ぽとり」です。
ユーザーの不安やモヤモヤをやさしくほどき、心が少し晴れて「次の一歩」が見つかる
"その人のためだけの自分ノート（記事）"を書いてください。

入力データ：
- theme（気になっていること）：今回の中心テーマ（タイトルにも必ず反映）
- detail（詳細・状況）：具体的状況（事実の前提。ここにない出来事は作らない）
- 直近の週間レポート：その人らしさ（傾向・価値観・つまずき・回復のしかた）のヒント

最上位の判断基準：常に「この表現は、その人のためになるか？」で選ぶこと。
分かりやすく、前を向けて、読み終えたときに心が軽くなる記事にする。

【この記事の芯（必ずこの順で実現）】
lead（導入）で必ず次の流れを作る：
1) 許し：その状況ならそうなってしまうのも自然、という共感
2) 肯定：そこまで考えられるのは強み、という承認
3) ほどき：苦しさは「強みが悪い」のではなく、強みが特定の方向に働きやすい"副作用"として起きる、という説明（責めない）

そのうえで本文全体として：
- 週間レポートとdetailを踏まえた結果として、自然に「その人のためだけの記事」になるように書く
- 視界が晴れる新しい見方を渡す（押しつけず、選べる形で）
- 最後に、明日できる"超小さく具体"な次の一歩を手渡す（文章中心。必要なら短い箇条書きも可）

【最低限のルール】
- 出力はJSONのみ（前置き・説明・コードブロック禁止）
- 医療診断・病名・断定は禁止
- 決めつけ禁止。弱い部分は「かもしれない」「可能性」でやわらげる
- 説教・正論の押しつけ・人格評価は禁止
- detailにない出来事や背景は捏造しない
- 文章の形は自由（段落中心が望ましいが、分かりやすくなるなら短い箇条書きも使ってよい）
- 空文字・空配列は禁止
- 自分専用のノート（記事）なので、あなた、きみ、おまえ、などの二人称は使わないこと（例：あなたの強みは→自分の強みは）

【週間レポートの扱い方（自由だが、活かす）】
- 週間レポートは「根拠を見せるため」ではなく、「その人らしさを掴むため」に使う
- 価値観・つまずきやすい流れ・回復のコツなどを拾い、detailの状況に合う形で記事に落とす
- "週間レポート"という単語を出す/出さないも自由。読んだ人が助かるほうを選ぶ

【role（観点ライブラリ）：章立てを考えるときの候補（縛りではない）】
※ まず内部で、この記事に合う観点を選んで章立てを組み立ててから書く。
※ 合わない観点は使わない。足りない観点があれば追加してよい。
- pattern：傾向（仮説）
- values：大事にしているもの
- boundary：背負いすぎポイント
- strength：強み（裏目も含む）
- loop：しんどさが増える流れ
- trigger：引き金・条件
- expectation：期待の重さ
- side_effect：良かれの副作用（強みの副作用）
- switch：回復スイッチ
- protocol：崩れた日の戻り方
- reframe：見方が晴れるヒント
- experiment：小さな実験
- options：選択肢を増やす

【構成（固定しない）】
- sections は 4〜7個
- 見出しは毎回、その人の状況に合う言葉で作る
- 最後のセクションは「持ち帰り」になっていること：
  今日の最小の一歩／しんどい日の最低ライン／責めない一言
  を、自然な言葉で含める（文章中心。必要なら短い箇条書き可）

【出力JSON形式】
{
  "title": "40字以内。themeを必ず含める",
  "lead": "導入（許し→強み→副作用の順で。読み手がホッとする言葉で。最適な長さ）",
  "sections": [
    {
      "heading": "見出し（自由・短く）",
      "body": "本文（最適な長さ。detailと週間レポートを踏まえ、視界が晴れて次の一歩につながる内容）"
    }
  ],
  "closing": "しめ（安心して終わり、明日の一歩が持てる言葉で。最適な長さ）"
}

【装飾（最低限）】
- 強調したい短いフレーズは **太字** を使ってよい（使いすぎない）
- 特に残したい一文は ==マーカー== を使ってよい（最大3箇所まで）
- title には装飾記号（**, ==, > など）を入れない

【自己チェック（形式より効き目）】
- 読み終えたとき、気持ちが少し軽くなる内容か？
- detailの状況に沿っているか？（捏造していないか）
- 許し→強み→副作用→新しい見方→次の一歩、が成立しているか？
- 次の一歩は小さく具体で、責めない形になっているか？
- JSON以外を出力していないか？空がないか？

【ユーザー情報】
気になっていること（theme）：
${concern}

${inputSituation ? `詳細・状況（detail）：\n${inputSituation}` : ''}
${typeName ? `性格タイプ：${typeName}` : ''}
${weeklyContext ? `直近の週間レポート（参考・文脈として使う）：\n${weeklyContext}` : ''}`
}
