import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateSectionScores } from '@/lib/diagnosis/paid-questions'
import { anthropic, extractJSON } from '@/lib/anthropic'

const FIELD_ORDER = [
  'hardship_root', 'hardship_root_steps', 'hardship_root_tip',
  'core_pattern', 'reaction_flow', 'core_pattern_tip',
  'relationship_pattern', 'relationship_steps', 'relationship_tip',
  'boundary_setting', 'boundary_steps', 'boundary_tip',
  'ease_life', 'ease_hints',
  'recovery_hint', 'recovery_hint_items',
  'ideal_work', 'ideal_work_jobs',
  'growth_hint', 'growth_hint_items',
  'letter',
] as const

type FieldName = typeof FIELD_ORDER[number]

function extractField(accumulated: string, field: FieldName, nextField: FieldName): unknown {
  const fieldKey = `"${field}":`
  const nextKey = `"${nextField}":`
  const fieldIdx = accumulated.indexOf(fieldKey)
  const nextIdx = accumulated.indexOf(nextKey)
  if (fieldIdx === -1 || nextIdx === -1 || nextIdx <= fieldIdx) return undefined
  const valueStr = accumulated.slice(fieldIdx + fieldKey.length, nextIdx).trim().replace(/,\s*$/, '')
  try { return JSON.parse(valueStr) } catch { return undefined }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const diagnosisId = searchParams.get('diagnosisId')
  if (!diagnosisId) return new Response('diagnosisId required', { status: 400 })

  const adminClient = createAdminClient()
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const { data: paidRow } = await adminClient
          .from('reports').select('content').eq('diagnosis_id', diagnosisId).eq('type', 'paid').maybeSingle()

        if (paidRow?.content) {
          const content = paidRow.content as Record<string, unknown>
          for (const f of FIELD_ORDER) {
            if (content[f] !== undefined) send({ field: f, value: content[f] })
          }
          send({ done: true })
          controller.close()
          return
        }

        // Fetch paid answers and free report for generation
        const [{ data: paidAnswers }, { data: freeReport }] = await Promise.all([
          adminClient.from('paid_diagnosis_answers').select('answers').eq('diagnosis_id', diagnosisId).maybeSingle(),
          adminClient.from('reports').select('content').eq('diagnosis_id', diagnosisId).eq('type', 'free').maybeSingle(),
        ])

        if (!paidAnswers || !freeReport) {
          send({ error: 'not found' })
          controller.close()
          return
        }

        const self = freeReport.content as {
          typeCode: string; typeName: string; axis1Name: string; axis2Name: string
          tagline: string; overview_para1: string; overview_para2: string
        }
        const scores = calculateSectionScores(paidAnswers.answers)

        const prompt = `あなたはメンタルウェルネスサービス「CocoHare（ここはれ）」の有料詳細レポートを生成するAIです。
サービスのコンセプト：「こころ晴れる毎日を」

【本人の無料診断結果】
- タイプ: ${self.typeCode}「${self.typeName}」
- 主特性: ${self.axis1Name} / 副特性: ${self.axis2Name}
- タグライン: ${self.tagline}
- 概要: ${self.overview_para1} ${self.overview_para2}

【追加診断スコア（各セクション満点16点）】
- 消耗パターン: ${scores.section3}/16（高いほど環境・人間関係の影響を受けて消耗しやすい）
- 回復パターン: ${scores.section4}/16（高いほど一人の時間・内向きな回復が有効）
- 人間関係スタイル: ${scores.section5}/16（高いほど深い関係を重視し、広い付き合いが苦手）
- 自己基準: ${scores.section6}/16（高いほど自分に厳しく、完璧主義・自己批判の傾向）
- 感情の処理スタイル: ${scores.section7}/16（高いほど感情を内側で処理し、外に出しにくい）

【出力前に必ず内部分析を行うこと（出力に含めない）】
スコア間の「緊張・矛盾」を特定する。例：消耗高×感情処理内向き→外からダメージを受けやすいのに外に出せず内側に溜め込む。
このひとの典型的な反応連鎖を「外的きっかけ→内的解釈→感情/身体反応→行動→結果」の流れで把握する。
タイプ特性と5スコアを足し算ではなく「掛け算（相互作用）」として統合する。
スコアを数字で言及せず、特性として自然に言語化。文体は「です・ます」調。批判せず共感と肯定を基調に。

必ずこの順番・このフィールド名でJSONのみ返してください（hardship_root_steps 4項目 / reaction_flow 5項目 / relationship_steps 4項目 / boundary_steps 4項目 / ease_hints 5項目 / recovery_hint_items 5項目 / ideal_work_jobs 6項目 / growth_hint_items 5項目）：

{
  "hardship_root": "しんどさの根っこ（220〜260文字）: タイプ特性と5スコアの相互作用から、なぜこのひとがしんどさを感じやすいのかを構造として説明する。「〜だからこそ〜してしまう」因果連鎖で書く",
  "hardship_root_steps": ["気質・特性（20文字以内）: このひとの根本的な気質・傾向", "しんどくなる状況（20文字以内）: その気質が特に消耗する場面", "内側の動き（20文字以内）: そのとき内側で何が起きているか", "しんどさの形（20文字以内）: 結果として現れるしんどさの形"],
  "hardship_root_tip": "しんどさの根っこへの対処ヒント（40〜60文字）: このひとの根っこに対して今日から小さく始められる具体的な行動を一文で。「〜するだけでいい」という形で",
  "core_pattern":"典型的な反応連鎖（160〜200文字）: 外的きっかけ→内的解釈→感情/身体反応→行動→結果の流れを「こんな場面で、こう感じて、こうなってしまう」として具体的に",
  "reaction_flow": ["外的きっかけ（20文字以内）: 連鎖を引き起こす典型的な状況や出来事", "内的解釈（20文字以内）: その出来事をどう受け取るか", "感情・身体反応（20文字以内）: 湧き上がる感情や身体感覚", "行動（15文字以内）: 実際に取りがちな行動", "結果（15文字以内）: 繰り返しがちな結末"],
  "core_pattern_tip": "反応連鎖への対処ヒント（40〜60文字）: この連鎖に気づいたときに試せる具体的な介入を一文で。「〜するだけでいい」という形で",
  "relationship_pattern": "人間関係での傾向（160〜200文字）: 人間関係スタイルと感情処理スタイルの相互作用を踏まえ、強みとしんどさの両面から",
  "relationship_steps": ["強みとして出ること（20文字以内）: 人間関係で自然に発揮される強み", "起きやすいパターン（20文字以内）: 繰り返しやすい関係のパターン", "しんどくなる場面（20文字以内）: 特に消耗しやすい人間関係の場面", "乗り越えのポイント（20文字以内）: 楽になるための視点や行動"],
  "relationship_tip": "人間関係への対処ヒント（40〜60文字）: この傾向を踏まえた、人間関係で今日から使える具体的な行動を一文で。「〜するだけでいい」という形で",
  "boundary_setting": "境界線の引き方（160〜200文字）: 消耗・人間関係スタイルの組み合わせを踏まえ、自分を守るための具体的な境界線の引き方を。「〜してもいいんです」を含める",
  "boundary_steps": ["消耗サイン（20文字以内）: このひとが限界に近づいているサイン", "必要な理由（20文字以内）: このひとに境界線が特に必要な理由", "引き方（20文字以内）: 実際にどう境界線を引くか", "自分への許可（20文字以内）: 境界線を引くことへの自己肯定の言葉"],
  "boundary_tip": "境界線への対処ヒント（40〜60文字）: 境界線を引くために今すぐ試せる具体的な一言・行動を一文で。「〜するだけでいい」という形で",
  "ease_life": "生きづらさを和らげるヒント（160〜200文字）: このタイプ・スコアが生みやすい日常の生きづらさを踏まえ、小さく始められる対処策を。「〜するだけでいい」という軽い表現を含める",
  "ease_hints": [{"title": "10文字以内", "description": "生きづらさを和らげる具体的なアクション（25〜40文字）"}],
  "recovery_hint": "回復のヒント（160〜200文字）: 消耗・回復スコアの組み合わせを踏まえ、このひとに実際に効く回復の方向性を。一般論ではなくこのタイプ・このスコアならでは",
  "recovery_hint_items": [{"title": "10文字以内", "description": "具体的にどんな行動・状態が回復につながるか（25〜40文字）"}],
  "ideal_work": "向いてる働き方・仕事（160〜200文字）: このタイプ・スコアから、どんな環境・役割・働き方が合うかを具体的に",
  "ideal_work_jobs": [{"title": "職種名（10文字以内）", "description": "なぜこの職種が合うか、特性との接点を含める（30〜45文字）"}],
  "growth_hint": "自己成長のヒント（160〜200文字）: 自己基準スコアの特性を踏まえ、自己批判の罠を避けながら前進するための視点を",
  "growth_hint_items": [{"title": "10文字以内", "description": "25〜40文字"}],
  "letter": "今のぽとりからあなたへの手紙（300〜350文字）: 書き出しに宛名（「〜さんへ」など）は不要。本文から直接書き始め、「ぽとりより」で締める。このひとの5スコア組み合わせが示す気づきにくい自分の姿を温かく伝える手紙"
}
JSONのみ返してください。`

        let accumulated = ''
        const emitted = new Set<FieldName>()
        const results = new Map<FieldName, unknown>()

        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 8000,
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
          console.error('[paid stream] JSON.parse failed, using partial data')
          full = Object.fromEntries(results.entries())
        }

        // Emit remaining fields (especially 'letter' which has no next trigger)
        for (const field of FIELD_ORDER) {
          if (!emitted.has(field) && full[field] !== undefined) {
            send({ field, value: full[field] })
          }
        }

        await adminClient.from('reports').upsert(
          { diagnosis_id: diagnosisId, user_id: null, type: 'paid', content: full },
          { onConflict: 'diagnosis_id,type' }
        )

        send({ done: true })
        controller.close()
      } catch (err) {
        console.error('[paid stream error]', err)
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
      'X-Accel-Buffering': 'no',
    },
  })
}
