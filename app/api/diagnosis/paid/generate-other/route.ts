import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateSectionScores } from '@/lib/diagnosis/paid-questions'
import { PERSONALITY_TYPES, type PersonalityType } from '@/lib/diagnosis/types'
import { anthropic, extractJSON } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const { diagnosisId, reportType } = await request.json()
    if (!diagnosisId || !['paid_other_single', 'paid_other_multi'].includes(reportType)) {
      return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 既に存在すれば即返す
    const { data: existing } = await adminClient
      .from('reports')
      .select('id')
      .eq('diagnosis_id', diagnosisId)
      .eq('type', reportType)
      .maybeSingle()

    if (existing) return NextResponse.json({ ready: true })

    // 無料レポート
    const { data: freeReport } = await adminClient
      .from('reports').select('content').eq('diagnosis_id', diagnosisId).eq('type', 'free').single()
    if (!freeReport) return NextResponse.json({ ready: false, error: '無料レポートが見つかりません' }, { status: 404 })

    const self = freeReport.content as {
      typeCode: string; typeName: string; axis1Name: string; axis2Name: string
    }

    // 有料回答（スコア計算用）
    const { data: paidAnswers } = await adminClient
      .from('paid_diagnosis_answers').select('answers').eq('diagnosis_id', diagnosisId).maybeSingle()
    if (!paidAnswers) return NextResponse.json({ ready: false, error: '有料回答が見つかりません' }, { status: 404 })

    const scores = calculateSectionScores(paidAnswers.answers as number[])

    // 他者回答を取得
    const { data: allLinks } = await adminClient
      .from('other_perspective_links').select('id').eq('diagnosis_id', diagnosisId)
    const linkIds = allLinks?.map((l: { id: string }) => l.id) ?? []

    const { data: otherAnswers } = await adminClient
      .from('other_perspective_answers')
      .select('observer_type_code, comparison')
      .in('link_id', linkIds)
      .order('created_at', { ascending: false })

    const answerCount = otherAnswers?.length ?? 0

    let prompt = ''
    let content: Record<string, string> = {}

    if (reportType === 'paid_other_single') {
      if (answerCount < 1) return NextResponse.json({ ready: false, error: '他者回答がありません' })

      const latest = otherAnswers![0]
      const obsType = PERSONALITY_TYPES[latest.observer_type_code as PersonalityType]
      const obsLabel = obsType
        ? `${latest.observer_type_code}「${obsType.name}」（${obsType.axis1Name} × ${obsType.axis2Name}）`
        : latest.observer_type_code
      const comp = latest.comparison as { open_window: string; blind_window: string; hidden_window?: string; gap_reason?: string } | null

      prompt = `あなたはメンタルウェルネスサービス「CocoHare（ここはれ）」の有料詳細レポート（他者視点統合版）を生成するAIです。
サービスのコンセプト：「こころ晴れる毎日を」

【本人の無料診断結果】
- タイプ: ${self.typeCode}「${self.typeName}」
- 主特性: ${self.axis1Name} / 副特性: ${self.axis2Name}

【追加診断スコア（各セクション満点16点）】
- 消耗パターン: ${scores.section3}/16（高いほど環境・人間関係の影響を受けて消耗しやすい）
- 回復パターン: ${scores.section4}/16（高いほど一人の時間・内向きな回復が有効）
- 人間関係スタイル: ${scores.section5}/16（高いほど深い関係を重視し、広い付き合いが苦手）
- 自己基準: ${scores.section6}/16（高いほど自分に厳しく、完璧主義・自己批判の傾向）
- 感情の処理スタイル: ${scores.section7}/16（高いほど感情を内側で処理し、外に出しにくい）

【他者から見たあなた（1人の視点）】
- 他者タイプ: ${obsLabel}
- 開放の窓（共通して認識）: ${comp?.open_window ?? '未生成'}
- 盲点の窓（他者が感じている）: ${comp?.blind_window ?? '未生成'}
- 秘密の窓（外に出にくい内側）: ${comp?.hidden_window ?? '未生成'}
- ズレの理由: ${comp?.gap_reason ?? '未生成'}

【出力前に必ず内部分析を行うこと（出力に含めない）】
1. 40問スコアと他者視点の「接点・矛盾」を探す
   例：感情処理内向き（section7高）なのに他者が「温かみがある」と感じている
   → 内側に閉じ込めているつもりの感情が実はにじみ出ている証拠
2. スコアの特性が、なぜ他者の認識（盲点・秘密の窓）と一致 or 矛盾するのかを分析する
3. 「本人が見えていない自分」の全体像を、スコアと他者視点の両方から統合して把握する

【生成の目的】
40問スコアと他者視点を統合し、本人だけでは気づけない「外から見た自分」の深い分析を。
スコアを数字で言及せず特性として言語化。文体は「です・ます」調。批判せず温かく。

{
  "other_deep_pattern": "他者から見た消耗・回復パターン（180〜220文字）: 40問スコアと他者視点を統合し、スコアの特性が他者の認識とどう接点・矛盾するかを分析する。「〜に見えているのかもしれません」という柔らかい語尾を含める",
  "hidden_strength": "見えていない強み（180〜220文字）: 40問データと他者視点を統合し、本人が過小評価しているが他者にははっきり見えている強みを。スコアのどの特性がこの強みを支えているかも含める。「自分が思っている以上に〜」という表現を含める",
  "integration_message": "統合メッセージ（120〜150文字）: スコアと他者視点を総合して見えてくる、このひとの『知られざる自分の姿』を一言で。温かい言葉で締める"
}
JSONのみ返してください。`

    } else {
      // paid_other_multi
      if (answerCount < 3) return NextResponse.json({ ready: false, error: '他者回答が3人未満です' })

      const { data: multiReport } = await adminClient
        .from('reports').select('content').eq('diagnosis_id', diagnosisId).eq('type', 'other_multi').maybeSingle()

      const multi = multiReport?.content as {
        consensus_strength: string; collective_blind: string; diversity_note: string
      } | null

      const observerLines = otherAnswers!.map((a: { observer_type_code: string }, i: number) => {
        const typeDef = PERSONALITY_TYPES[a.observer_type_code as PersonalityType]
        return typeDef
          ? `- 観察者${i + 1}: ${a.observer_type_code}「${typeDef.name}」（${typeDef.axis1Name} × ${typeDef.axis2Name}）`
          : `- 観察者${i + 1}: ${a.observer_type_code}`
      }).join('\n')

      prompt = `あなたはメンタルウェルネスサービス「CocoHare（ここはれ）」の有料詳細レポート（複数他者視点統合版）を生成するAIです。
サービスのコンセプト：「こころ晴れる毎日を」

【本人の無料診断結果】
- タイプ: ${self.typeCode}「${self.typeName}」
- 主特性: ${self.axis1Name} / 副特性: ${self.axis2Name}

【追加診断スコア（各セクション満点16点）】
- 消耗パターン: ${scores.section3}/16
- 回復パターン: ${scores.section4}/16
- 人間関係スタイル: ${scores.section5}/16
- 自己基準: ${scores.section6}/16
- 感情の処理スタイル: ${scores.section7}/16

【複数の他者から見た結果（${answerCount}人）】
${observerLines}
${multi ? `
【みんなから見たあなた（生成済み）】
- みんなが感じる強み: ${multi.consensus_strength}
- 隠れた魅力: ${multi.collective_blind}
- 見る人で異なる一面: ${multi.diversity_note}` : ''}

上記の40問データと複数他者視点を統合して分析してください。
文体は「です・ます」調。批判せず温かく。スコアを数字で言及せず特性として自然に言語化してください。

以下のJSON形式で生成してください：

{
  "collective_root": "複数人が感じるしんどさの根っこ（200〜240文字）：複数の他者視点と40問スコアを統合し、複数人が共通して感じているあなたのしんどさの本質を。「みんなが感じているのは〜」という表現を含める",
  "growth_potential": "みんなが信じるあなたの可能性（200〜240文字）：複数人が感じているあなたの成長・変化の可能性を。「あなたにはすでに〜がある」という肯定的な表現を含める"
}
JSONのみ返してください。`
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    content = JSON.parse(extractJSON(responseText))

    const { error: insertError } = await adminClient
      .from('reports')
      .insert({ diagnosis_id: diagnosisId, user_id: null, type: reportType, content })

    if (insertError) {
      return NextResponse.json({ ready: false, error: `DB保存エラー: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ ready: true })
  } catch (err) {
    return NextResponse.json(
      { ready: false, error: err instanceof Error ? err.message : '生成に失敗しました' },
      { status: 500 }
    )
  }
}
