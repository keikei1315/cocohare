import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateType, AXIS1_NAMES, AXIS2_NAMES } from '@/lib/diagnosis/types'
import { anthropic, extractJSON } from '@/lib/anthropic'

const FIELD_ORDER = [
  'overview_para1', 'overview_para2', 'aru_aru',
  'strengths_overview', 'strengths',
  'painful_pattern_overview', 'painful_pattern',
  'energizing', 'energizing_items',
  'draining', 'draining_items', 'message',
] as const

type FieldName = typeof FIELD_ORDER[number]

function extractField(accumulated: string, field: FieldName, nextField: FieldName): unknown {
  const fieldKey = `"${field}":`
  const nextKey = `"${nextField}":`
  const fieldIdx = accumulated.indexOf(fieldKey)
  const nextIdx = accumulated.indexOf(nextKey)
  if (fieldIdx === -1 || nextIdx === -1 || nextIdx <= fieldIdx) return undefined
  const valueStr = accumulated.slice(fieldIdx + fieldKey.length, nextIdx).trim().replace(/,\s*$/, '')
  try {
    return JSON.parse(valueStr)
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const diagnosisId = searchParams.get('diagnosisId')

  if (!diagnosisId) {
    return new Response('diagnosisId required', { status: 400 })
  }

  const adminClient = createAdminClient()
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Existing complete report → emit from DB
        const { data: existing } = await adminClient
          .from('reports')
          .select('content')
          .eq('diagnosis_id', diagnosisId)
          .eq('type', 'free')
          .maybeSingle()

        const existingContent = existing?.content as Record<string, unknown> | null
        if (existingContent?.strengths) {
          for (const field of FIELD_ORDER) {
            if (existingContent[field] !== undefined) {
              send({ field, value: existingContent[field] })
            }
          }
          send({ done: true })
          controller.close()
          return
        }

        // Fetch diagnosis
        const { data: diag } = await adminClient
          .from('diagnoses')
          .select('answers, user_id')
          .eq('id', diagnosisId)
          .single()

        if (!diag) {
          send({ error: 'not found' })
          controller.close()
          return
        }

        const { axis1, axis2, axis1Scores, axis2Scores, typeCode, typeDef } = calculateType(diag.answers)

        const axis1Pct = {
          A: Math.round(50 + (axis1Scores.A / 12) * 50),
          B: Math.round(50 + (axis1Scores.B / 12) * 50),
          C: Math.round(50 + (axis1Scores.C / 12) * 50),
          D: Math.round(50 + (axis1Scores.D / 12) * 50),
        }
        const axis2Pct = {
          '1': Math.round(50 + (axis2Scores['1'] / 8) * 50),
          '2': Math.round(50 + (axis2Scores['2'] / 8) * 50),
          '3': Math.round(50 + (axis2Scores['3'] / 8) * 50),
          '4': Math.round(50 + (axis2Scores['4'] / 8) * 50),
        }

        const prompt = `あなたはメンタルウェルネスサービス「CocoHare（ここはれ）」の診断レポートを生成するAIです。
サービスのコンセプト：「こころ晴れる毎日を」
ターゲット：外から見るとしっかりしているが、内側では毎日低空飛行のしんどさを感じている人。

ユーザーの診断結果：
- タイプ: ${typeCode}「${typeDef.name}」
- 主特性: ${AXIS1_NAMES[axis1]}（${axis1Pct[axis1]}%）
- 副特性: ${AXIS2_NAMES[axis2]}（${axis2Pct[axis2]}%）
- 基本特性スコア: 共感性${axis1Pct.A}% / 誠実さ${axis1Pct.B}% / 感受性${axis1Pct.C}% / 思慮深さ${axis1Pct.D}%
- 補助特性スコア: 思いやり${axis2Pct['1']}% / 向上心${axis2Pct['2']}% / 繊細さ${axis2Pct['3']}% / 洞察力${axis2Pct['4']}%

【出力前に必ず内部分析（出力に含めない）】
1. このスコア組み合わせが生む核心的葛藤を特定する
2. 強みの副作用（強みがあるからこそ起きるしんどさ）を掴む
3. 複数特性の「掛け合わせ」として統合する

文体は「です・ます」調。評価・判断せず、共感と肯定を基調に。スコアの数字は言及せず特性として言語化。

必ずこの順番・このフィールド名でJSONのみ返してください（strengths 6項目 / painful_pattern 5項目 / energizing_items 5項目 / draining_items 5項目）：

{
  "overview_para1": "このスコア組み合わせを持つ人の本質（200〜250文字）。「あなたは〜」で始める。複数特性の掛け合わせが生む独特の世界の見え方・感じ方を語りかける",
  "overview_para2": "このスコア組み合わせならではの日常のしんどさ・葛藤（150〜200文字）。強みがあるからこそ起きる副作用として書く",
  "aru_aru": [
    "あるある1（30〜50文字）: 「〜なこと、ない？」など具体的な場面や行動パターン",
    "あるある2（30〜50文字）",
    "あるある3（30〜50文字）"
  ],
  "strengths_overview": "あなたの強みについての総評（80〜120文字）。このタイプならではの強みの本質を「〜だからこそ〜できる」視点で語りかける",
  "strengths": [
    {"title": "強みの名前（10文字以内）", "body": "この強みが日常のどんな場面で出るか具体的に（40〜60文字）"}
  ],
  "painful_pattern_overview": "あなたを苦しめるパターンについての総評（80〜120文字）。これは弱さではなく特性の副作用だと共感を込めて伝える",
  "painful_pattern": [
    {"title": "パターン名（12文字以内）", "body": "「〜だからこそ〜してしまう」因果構造で（40〜60文字）。責めない視点で"}
  ],
  "energizing": "元気になるもの・回復できること（100〜150文字）",
  "energizing_items": [{"title": "10文字以内", "description": "25〜40文字"}],
  "draining": "疲れさせるもの・消耗すること（100〜150文字）",
  "draining_items": [{"title": "10文字以内", "description": "25〜40文字"}],
  "message": "ぽとりからの一言（80〜100文字）。「あなたは〜でいい」など背中をそっと押す言葉で"
}
JSONのみ返してください。`

        let accumulated = ''
        const emitted = new Set<FieldName>()
        const results = new Map<FieldName, unknown>()

        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 6000,
          messages: [{ role: 'user', content: prompt }],
        })

        stream.on('text', (text) => {
          accumulated += text
          for (let i = 0; i < FIELD_ORDER.length - 1; i++) {
            const field = FIELD_ORDER[i]
            if (emitted.has(field)) continue
            const value = extractField(accumulated, field, FIELD_ORDER[i + 1])
            if (value !== undefined) {
              emitted.add(field)
              results.set(field, value)
              send({ field, value })
            }
          }
        })

        await stream.finalMessage()

        let full: Record<string, unknown>
        try {
          full = JSON.parse(extractJSON(accumulated)) as Record<string, unknown>
        } catch {
          console.error('[free stream] JSON.parse failed, using partial extracted data')
          full = Object.fromEntries(results.entries())
        }

        // Emit remaining fields (especially 'message' which has no next trigger)
        for (const field of FIELD_ORDER) {
          if (!emitted.has(field) && full[field] !== undefined) {
            send({ field, value: full[field] })
          }
        }

        // Save single 'free' record with all fields
        await adminClient.from('reports').upsert(
          {
            diagnosis_id: diagnosisId,
            user_id: diag.user_id,
            type: 'free',
            content: {
              typeCode,
              typeName: typeDef.name,
              tagline: typeDef.tagline,
              axis1Name: typeDef.axis1Name,
              axis2Name: typeDef.axis2Name,
              axis1Pct,
              axis2Pct,
              ...full,
            },
          },
          { onConflict: 'diagnosis_id,type' }
        )

        send({ done: true })
        controller.close()
      } catch (err) {
        console.error('[free stream error]', err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'generation failed' })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
