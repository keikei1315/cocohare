import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PERSONALITY_TYPES, type PersonalityType } from '@/lib/diagnosis/types'
import { anthropic, extractJSON } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const { diagnosisId } = await request.json()
    if (!diagnosisId) return NextResponse.json({ error: 'diagnosisId が必要です' }, { status: 400 })

    const adminClient = createAdminClient()

    // 既にレポートがあればそのまま返す
    const { data: existing } = await adminClient
      .from('reports')
      .select('id')
      .eq('diagnosis_id', diagnosisId)
      .eq('type', 'other_multi')
      .maybeSingle()

    if (existing) return NextResponse.json({ ready: true })

    // 本人の診断結果を取得
    const { data: selfReport } = await adminClient
      .from('reports')
      .select('content')
      .eq('diagnosis_id', diagnosisId)
      .eq('type', 'free')
      .single()

    if (!selfReport) return NextResponse.json({ ready: false, error: '元の診断が見つかりません' }, { status: 404 })

    const self = selfReport.content as { typeCode: string; typeName: string; axis1Name: string; axis2Name: string }

    // 他者回答を取得
    const { data: allLinks } = await adminClient
      .from('other_perspective_links')
      .select('id')
      .eq('diagnosis_id', diagnosisId)

    const linkIds = allLinks?.map((l: { id: string }) => l.id) ?? []
    if (linkIds.length === 0) return NextResponse.json({ ready: false, error: 'リンクがありません' })

    const { data: allAnswers } = await adminClient
      .from('other_perspective_answers')
      .select('observer_type_code')
      .in('link_id', linkIds)

    if (!allAnswers || allAnswers.length < 3) {
      return NextResponse.json({ ready: false, error: `回答数が不足しています（${allAnswers?.length ?? 0}人）` })
    }

    const observerLines = allAnswers.map((a: { observer_type_code: string }, i: number) => {
      const typeDef = PERSONALITY_TYPES[a.observer_type_code as PersonalityType]
      return typeDef
        ? `- 観察者${i + 1}: ${a.observer_type_code}「${typeDef.name}」（${typeDef.axis1Name} × ${typeDef.axis2Name}）`
        : `- 観察者${i + 1}: ${a.observer_type_code}`
    }).join('\n')

    const prompt = `あなたはメンタルウェルネスサービス「CocoHare（ここはれ）」の複数視点比較レポートを生成するAIです。
サービスのコンセプト：「こころ晴れる毎日を」

【本人の結果】
- タイプ: ${self.typeCode}「${self.typeName}」
- 主特性: ${self.axis1Name} / 副特性: ${self.axis2Name}

【複数の他者から見た結果（${allAnswers.length}人）】
${observerLines}

【出力前に必ず内部分析を行うこと（出力に含めない）】
1. ${allAnswers.length}人の診断結果の「共通点」と「相違点」を整理する
2. 全員が一致して感じている特性は何か、またなぜそれが一致しているか
3. 人によって印象が割れている部分はどこか、それはあなたの多面性としてどう解釈できるか
4. 本人の自己認識と他者の認識のズレから、まだ言語化されていない可能性を仮説として考える

【生成の目的・制約】
・本人が「みんなそう感じてくれてたんだ」「自分ってそういう人なんだ」と腑に落ちる体験を作る
・断定せず、「〜なのかもしれません」「〜と感じてくれているようです」のトーンで
・表面的な褒め言葉（「優しい」「思いやりがある」など）を避け、一段深い言語化を心がける
・文体は「です・ます」調

JSONのみ返してください:
{
  "gift_phrase": "あなたが周囲に自然と与えているものを表す短いフレーズ（15文字以内・名詞か短い体言止め。例：場を整える力、静かな安心感、前を向かせる存在）",
  "gift_description": "gift_phraseを80〜100文字で説明。あなたがなぜそういう存在なのかを、${allAnswers.length}人の視点から読み解いて",
  "consensus_tags": ["全員が共通して感じているキーワード1（8文字以内）", "キーワード2", "キーワード3"],
  "consensus_strength": "全員が一致して感じているあなたの強み（120〜150文字）: 複数人に共通して見えている特性を、具体的な場面・言葉で",
  "collective_blind": "多くの人が感じているがあなたは気づきにくい魅力（120〜150文字）: 「〜なのかもしれません」の語尾で",
  "divergent_note": "見る人によって印象が割れている部分と、それがあなたの多面性である理由（100〜120文字）: ズレをネガティブではなくポジティブな多様性として表現する",
  "johari_open": "全員に共通して見えているあなたの面（40〜60文字・体言止めや短文で）",
  "johari_blind": "他者は感じているがあなたは気づきにくい面（40〜60文字）",
  "johari_hidden": "あなたは感じているが外には見えにくい面（40〜60文字）",
  "johari_unknown": "まだ誰も気づいていない潜在的な可能性（40〜60文字）"
}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const content = JSON.parse(extractJSON(text))

    const { error: insertError } = await adminClient
      .from('reports')
      .insert({
        diagnosis_id: diagnosisId,
        user_id: null,
        type: 'other_multi',
        content,
      })

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
