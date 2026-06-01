import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateType, AXIS1_NAMES, AXIS2_NAMES, PERSONALITY_TYPES, type PersonalityType } from '@/lib/diagnosis/types'
import { anthropic, extractJSON } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const { token, answers } = await request.json()

    if (!token || !Array.isArray(answers) || answers.length !== 20) {
      return NextResponse.json({ error: '入力データが不正です' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: link } = await adminClient
      .from('other_perspective_links')
      .select('id, diagnosis_id')
      .eq('token', token)
      .single()

    if (!link) {
      return NextResponse.json({ error: 'リンクが無効です' }, { status: 404 })
    }

    const { data: report } = await adminClient
      .from('reports')
      .select('content')
      .eq('diagnosis_id', link.diagnosis_id)
      .eq('type', 'free')
      .single()

    if (!report) {
      return NextResponse.json({ error: '元の診断が見つかりません' }, { status: 404 })
    }

    const { axis1: obsAxis1, axis2: obsAxis2, typeCode: observerTypeCode } = calculateType(answers)

    const { data: saved, error: saveError } = await adminClient
      .from('other_perspective_answers')
      .insert({
        link_id: link.id,
        answers,
        observer_type_code: observerTypeCode,
        comparison: null,
      })
      .select('id')
      .single()

    if (saveError || !saved) {
      console.error('[Supabase save error]', saveError)
      return NextResponse.json({ error: 'DB保存エラー' }, { status: 500 })
    }

    const self = report.content as { typeCode: string; typeName: string; axis1Name: string; axis2Name: string }
    const answerId = saved.id
    const diagnosisId = link.diagnosis_id

    after(async () => {
      // 全回答者を使ったジョハリ生成（回答が増えるたびに再生成）
      try {
        const { data: allLinks } = await adminClient
          .from('other_perspective_links')
          .select('id')
          .eq('diagnosis_id', diagnosisId)

        const linkIds = allLinks?.map(l => l.id) ?? []

        const { data: allAnswers } = await adminClient
          .from('other_perspective_answers')
          .select('observer_type_code')
          .in('link_id', linkIds)
          .order('created_at', { ascending: true })

        const observerCount = allAnswers?.length ?? 1
        const observerLines = (allAnswers ?? []).map((a, i) => {
          const typeDef = PERSONALITY_TYPES[a.observer_type_code as PersonalityType]
          return typeDef
            ? `- 観察者${i + 1}: ${a.observer_type_code}「${typeDef.name}」（${typeDef.axis1Name} × ${typeDef.axis2Name}）`
            : `- 観察者${i + 1}: ${a.observer_type_code}`
        }).join('\n')

        const singlePrompt = `あなたはメンタルウェルネスサービス「CocoHare（ここはれ）」の他者視点比較レポートを生成するAIです。
サービスのコンセプト：「こころ晴れる毎日を」

【本人の結果】
- タイプ: ${self.typeCode}「${self.typeName}」
- 主特性: ${self.axis1Name} / 副特性: ${self.axis2Name}

【他者から見た結果（${observerCount}人）】
${observerLines}

【出力前に必ず内部分析を行うこと（出力に含めない）】
1. 本人と${observerCount}人の他者診断結果の「重なり」と「ズレ」を整理する
2. 本人タイプの特性のうち、内向きに発揮されるため外に見えにくい面を具体的に考える
3. 本人も他者も診断では捉えきれていない潜在的な才能・可能性を、このタイプの深層パターンから慎重に仮説として考える

【生成の目的】
本人と${observerCount}人の他者診断結果を分析し、ジョハリの窓（4象限）を生成してください。
本人が読んで「そう見えてるんだ」「そういう自分もいるかも」と温かく受け取れる言葉で。
決めつけず「〜なのかもしれません」「〜と感じてくれているようです」などで柔らかく。

{
  "open_window": "開放の窓（120〜150文字）: 本人も他者も共通して認識している特性・強み。${observerCount}人の診断に共通する要素から、自覚もあり周囲にも見えている面を具体的に",
  "blind_window": "盲点の窓（120〜150文字）: 他者は感じているが本人は気づきにくい魅力。他者の診断がより強く示している面から、本人が過小評価しているかもしれない良さを。「〜なのかもしれません」の語尾で",
  "hidden_window": "秘密の窓（120〜150文字）: 本人は感じているが他者にはまだ伝わっていない内面。どんな想いや価値観を内側に抱えているか、なぜ表に出にくいかを具体的に。最後に「少し打ち明けてみると、相手との距離がぐっと縮まるかもしれません」のような一文を添える",
  "unknown_window": "未知の窓（120〜150文字）: 本人も他者もまだ気づいていない潜在的な可能性。このタイプの深層パターンから推測される、まだ発揮されていない才能や新しい一面を。どんな場面や経験で開花しやすいかのヒントを含め、「〜な一面があるかもしれません」の語尾で"
}
JSONのみ返してください。`

        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          messages: [{ role: 'user', content: singlePrompt }],
        })
        const text = response.content[0].type === 'text' ? response.content[0].text : ''
        const comparison = JSON.parse(extractJSON(text))

        await adminClient
          .from('other_perspective_answers')
          .update({ comparison })
          .eq('id', answerId)
      } catch (err) {
        console.error('[single comparison error]', err)
      }

      // 3人以上ならマルチレポート生成
      try {
        const { data: allLinks } = await adminClient
          .from('other_perspective_links')
          .select('id')
          .eq('diagnosis_id', diagnosisId)

        const linkIds = allLinks?.map(l => l.id) ?? []
        if (linkIds.length === 0) return

        const { data: allAnswers } = await adminClient
          .from('other_perspective_answers')
          .select('observer_type_code')
          .in('link_id', linkIds)

        if ((allAnswers?.length ?? 0) < 3) return

        const observerLines = allAnswers!.map((a, i) => {
          const typeDef = PERSONALITY_TYPES[a.observer_type_code as PersonalityType]
          return typeDef
            ? `- 観察者${i + 1}: ${a.observer_type_code}「${typeDef.name}」（${typeDef.axis1Name} × ${typeDef.axis2Name}）`
            : `- 観察者${i + 1}: ${a.observer_type_code}`
        }).join('\n')

        const multiPrompt = `あなたはメンタルウェルネスサービス「CocoHare（ここはれ）」の複数視点比較レポートを生成するAIです。
サービスのコンセプト：「こころ晴れる毎日を」

【本人の結果】
- タイプ: ${self.typeCode}「${self.typeName}」
- 主特性: ${self.axis1Name} / 副特性: ${self.axis2Name}

【複数の他者から見た結果（${allAnswers!.length}人）】
${observerLines}

【出力前に必ず内部分析を行うこと（出力に含めない）】
1. ${allAnswers!.length}人の診断結果の「共通点」と「相違点」を整理する
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
  "gift_description": "gift_phraseを80〜100文字で説明。あなたがなぜそういう存在なのかを、${allAnswers!.length}人の視点から読み解いて",
  "consensus_tags": ["全員が共通して感じているキーワード1（8文字以内）", "キーワード2", "キーワード3"],
  "consensus_strength": "全員が一致して感じているあなたの強み（120〜150文字）: 複数人に共通して見えている特性を、具体的な場面・言葉で",
  "collective_blind": "多くの人が感じているがあなたは気づきにくい魅力（120〜150文字）: 「〜なのかもしれません」の語尾で",
  "divergent_note": "見る人によって印象が割れている部分と、それがあなたの多面性である理由（100〜120文字）: ズレをネガティブではなくポジティブな多様性として表現する",
  "johari_open": "全員に共通して見えているあなたの面（40〜60文字・体言止めや短文で）",
  "johari_blind": "他者は感じているがあなたは気づきにくい面（40〜60文字）",
  "johari_hidden": "あなたは感じているが外には見えにくい面（40〜60文字）",
  "johari_unknown": "まだ誰も気づいていない潜在的な可能性（40〜60文字）"
}`

        const multiResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [{ role: 'user', content: multiPrompt }],
        })
        const multiText = multiResponse.content[0].type === 'text' ? multiResponse.content[0].text : ''
        const multiContent = JSON.parse(extractJSON(multiText))

        // 既存のマルチレポートがあれば更新、なければ挿入
        const { data: existing } = await adminClient
          .from('reports')
          .select('id')
          .eq('diagnosis_id', diagnosisId)
          .eq('type', 'other_multi')
          .maybeSingle()

        if (existing) {
          await adminClient
            .from('reports')
            .update({ content: multiContent })
            .eq('id', existing.id)
        } else {
          await adminClient
            .from('reports')
            .insert({
              diagnosis_id: diagnosisId,
              user_id: null,
              type: 'other_multi',
              content: multiContent,
            })
        }
      } catch (err) {
        console.error('[multi comparison error]', err)
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: `処理に失敗しました: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
