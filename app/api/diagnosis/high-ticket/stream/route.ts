import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateStrengthScores } from '@/lib/diagnosis/high-ticket-questions'
import { anthropic, extractJSON } from '@/lib/anthropic'

const FIELD_ORDER = ['summary', 'strengths', 'core_insight', 'hardship_core', 'communication_style', 'talent_shadow', 'relationship_blueprint', 'energy_map', 'spiritual', 'roadmap', 'selfcare', 'inner_child', 'letter'] as const
type FieldName = typeof FIELD_ORDER[number]

function getZodiacSign(dateStr: string): string {
  const d = new Date(dateStr)
  const m = d.getMonth() + 1
  const day = d.getDate()
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return '牡羊座'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return '牡牛座'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 21)) return '双子座'
  if ((m === 6 && day >= 22) || (m === 7 && day <= 22)) return '蟹座'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return '獅子座'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return '乙女座'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 23)) return '天秤座'
  if ((m === 10 && day >= 24) || (m === 11 && day <= 22)) return '蠍座'
  if ((m === 11 && day >= 23) || (m === 12 && day <= 21)) return '射手座'
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return '山羊座'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return '水瓶座'
  return '魚座'
}

function getNumerology(dateStr: string): number {
  const digits = dateStr.replace(/-/g, '').split('').map(Number)
  let sum = digits.reduce((a, b) => a + b, 0)
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split('').map(Number).reduce((a, b) => a + b, 0)
  }
  return sum
}

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
        const { data: htRow } = await adminClient
          .from('reports').select('content').eq('diagnosis_id', diagnosisId).eq('type', 'high_ticket').maybeSingle()

        if (htRow?.content) {
          const content = htRow.content as Record<string, unknown>
          if (content['letter'] !== undefined && content['hardship_core'] !== undefined && content['inner_child'] !== undefined) {
            for (const f of FIELD_ORDER) {
              if (content[f] !== undefined) send({ field: f, value: content[f] })
            }
            send({ done: true })
            controller.close()
            return
          }
        }

        const { data: htAnswers } = await adminClient
          .from('high_ticket_answers')
          .select('strength_answers, deep_psych_answers, spiritual_answers, birthday, worries, goals, source_free_diagnosis_id')
          .eq('diagnosis_id', diagnosisId)
          .maybeSingle()

        if (!htAnswers) {
          send({ error: 'not found' })
          controller.close()
          return
        }

        const { strength_answers, deep_psych_answers, spiritual_answers, birthday, worries, goals, source_free_diagnosis_id } = htAnswers

        let freeReportSummary = ''
        if (source_free_diagnosis_id) {
          const { data: freeReport } = await adminClient
            .from('reports')
            .select('content')
            .eq('diagnosis_id', source_free_diagnosis_id)
            .eq('type', 'free')
            .maybeSingle()
          if (freeReport?.content) {
            const c = freeReport.content as { typeName?: string; axis1Name?: string; axis2Name?: string; tagline?: string }
            freeReportSummary = `性格タイプ：${c.typeName ?? ''}（${c.axis1Name ?? ''} × ${c.axis2Name ?? ''}）/ ${c.tagline ?? ''}`
          }
        }

        const strengths = calculateStrengthScores(strength_answers)
        const top5 = strengths.slice(0, 5)
        const zodiac = getZodiacSign(birthday)
        const numerology = getNumerology(birthday)

        const top5Text = top5.map((t: { talent: string; domain: string; score: number }, i: number) => `${i + 1}位：${t.talent}（${t.domain}・${t.score}/12点）`).join('\n')
        const deepText = (deep_psych_answers as string[]).map((a, i) => `Q${i + 1}：${a}`).join(' / ')
        const spiritText = Object.entries(spiritual_answers as Record<string, unknown>).map(([k, v]) => `${k}：${v}`).join(' / ')

        const baseContext = `
【基本情報】
${freeReportSummary ? `性格タイプ：${freeReportSummary}` : ''}
誕生日：${birthday}（${zodiac}・数秘${numerology}）
悩み：${worries}
目標：${goals}

【才能トップ5】
${top5Text}

【深層心理診断】
${deepText}

【スピリチュアル診断】
${spiritText}
`.trim()

        const prompt = `あなたはメンタルウェルネスサービス「CocoHare（ここはれ）」の完全版自己分析レポートを生成するAIです。
「こころ晴れる毎日を」がコンセプト。文体は「です・ます」調。批判せず共感と肯定を基調に。

${baseContext}

【出力前に必ず内部分析を行うこと（出力に含めない）】
1. 「このひとの物語の核」を1文で確定する（才能×深層心理×悩みの根っこの接点）
2. 才能トップ5の中で悩みと最も緊張・矛盾関係にある才能を特定する
3. 深層心理診断からこのひとが手放せないもの・大切にしていることを特定する
4. 深層心理診断から、このひとが無意識に課している「厳しい自己ルール」を特定する
5. このひとの回復に効く条件を深層心理から特定する
6. 才能トップ5が「しんどさ」に変わる瞬間のパターンを特定する
7. このひとのコミュニケーションの強みと無意識の癖を特定する

以下の順番・フィールド名でJSONのみ返してください：

{
  "summary": {
    "title": "このひとの本質を表すキャッチコピー（20文字以内）。才能と深層心理の交点から生まれる言葉で",
    "body": "総合自己分析（800〜1000文字）。1.このひとの本質、2.今の悩みが生まれる構造（〜だからこそ〜）、3.しんどさの中に隠れている強み、4.目標への道 の流れで自然に統合する"
  },
  "strengths": {
    "top5": [
      {
        "rank": 1,
        "name": "才能名",
        "domain": "領域",
        "tagline": "この才能を一言で表す（20文字以内）",
        "description": "この才能の詳細説明（120〜160文字）。あなたは〜で語りかける。日常のどんな場面でこの才能が出るかを具体的に",
        "shines_when": "最も活きる場面（60〜80文字）",
        "watch_out": "この才能の副作用（60〜80文字）。強みだからこそ起きやすいしんどさのパターン。責めない視点で",
        "career_hint": "向いている方向・キャリア示唆（60〜80文字）",
        "tip": "今すぐ使える活かし方Tip（40〜60文字）。明日から実践できる具体的な一歩。「〜してみよう」という形で"
      }
    ],
    "synergy_note": "トップ5才能の組み合わせが生む、このひとならではの強みのパターン（100〜140文字）",
    "domain_summary": "4領域のバランスから見たこのひとの全体像（120〜160文字）",
    "relationship_pattern": "才能が対人関係でどう出るか（120〜160文字）。強みになる面としんどさになる面の両方を"
  },
  "core_insight": {
    "essence": "才能×深層心理の核心（200〜250文字）。60問の才能と12問の深層心理を統合して初めて見えてくる、このひとの本質の核。タイプ診断とは異なる、より深い切り口で",
    "unlock": "このひとが本来の力を発揮できる条件（120〜160文字）。深層心理の回答から読み解く、このひとが「ゾーン」に入るとき。才能が最大限に活きる状況・環境・心理状態",
    "blindspot": "このひとが気づいていない自分の側面（120〜160文字）。深層心理の象徴と才能の組み合わせから見えてくる、本人が見えていない潜在的な強みや課題"
  },
  "hardship_core": {
    "root_pattern": "生きづらさの根幹となる心のパターン（200〜250文字）。才能×深層心理から読み解く、このひとが無意識に繰り返している心のクセ・防衛パターン（例：完璧主義・承認欲求・自己犠牲など）。「あなたには〜というパターンがある」という語りかけで、診断データを根拠に具体的に描写する",
    "defense_origin": "この防衛反応はどこから来たのか（150〜200文字）。深層心理診断の回答から推測される、過去の経験が形成した心の傷・無意識のルール。「〜だったのかもしれない」「〜という経験が、あなたに〜と学ばせた可能性があります」という推測表現で、断定せず共感的・温かく",
    "strength_shadow": "その防衛反応が生んだ美しい強みと、それがかえって自分を苦しめる瞬間（150〜200文字）。同じパターンが才能として輝く場面と、過剰になったときにしんどさに変わる場面を両方描く。「だからこそあなたは〜できる。でも同時に、それが〜のときに苦しさになる」という構造で",
    "reframe_hints": ["認知を少しずつやわらげるための、具体的で実践しやすい日々のヒント（40〜60文字）×5個。「〜してみよう」「〜と自分に声をかけてみよう」など行動レベルで。一般論禁止。このひとの才能・心のパターンに根ざした個別のヒントを"],
    "daily_awareness": "毎日、ひとつだけ意識してほしいこと（80〜120文字）。シンプルで覚えやすい言葉で。このひとの心のパターンを緩めていくための、小さくても確かな気づきのタネを"
  },
  "communication_style": {
    "description": "このひとのコミュニケーションの本質（120〜160文字）。才能トップ5から見えるコミュニケーションスタイルの全体像",
    "strengths": "コミュニケーションでの強み（80〜120文字）。どんな関わり方が得意か",
    "cautions": "注意すべきパターン（80〜120文字）。無意識に相手を困らせてしまいやすい癖。責めない視点で",
    "tips": ["すぐ使える実践ヒント（30〜45文字）×5個"],
    "best_roles": ["このひとが輝くチームでの役割（20〜35文字）×3個"]
  },
  "talent_shadow": [
    {
      "talent": "才能名（top5と同じ順番・同じ名前で5つ）",
      "light": "この才能がポジティブに働く場面（40〜60文字）",
      "shadow": "しんどさに変わる瞬間（40〜60文字）。過度になると何が起きるか",
      "switch": "切り替えのヒント（40〜60文字）。しんどさに気づいたときに今すぐ試せること"
    }
  ],
  "relationship_blueprint": {
    "overview": "人間関係全体の傾向（120〜160文字）。才能トップ5と深層心理から見えるこのひとの対人パターン。どんな関係のなかで最もいきいきするかを具体的に",
    "compatible_types": ["安全に深く関われるタイプ（30〜45文字）×4個。才能・深層心理から判断した、このひとが自然体でいられる人物像"],
    "boundaries": "自分を守るために大切にしていいこと（100〜140文字）。このひとが消耗しないための境界線・自分ルール。「〜してもいい」という肯定的な言葉で",
    "connection_tips": ["心地よい関係をつくるための実践ヒント（30〜45文字）×4個。才能を活かした具体的な関わり方"],
    "distance_hint": "このひとに合った距離感の取り方（80〜100文字）。才能と深層心理から読み解く、安心できる関係距離のコツ"
  },
  "energy_map": {
    "charge_sources": ["エネルギーが補充される源（30〜45文字）×5個。才能・深層心理・スピリチュアルから読み解く、このひとが充電できる状況・行動・環境"],
    "drain_sources": ["エネルギーが消耗するパターン（30〜45文字）×5個。才能の副作用・深層心理から来る、無意識に消耗してしまうトリガー"],
    "warning_signs": "エネルギー切れのサインと早めの対処（100〜140文字）。このひと特有の消耗サイン（身体・感情・行動）と、気づいたらすぐできること",
    "rhythm_hint": "このひとに合ったエネルギー管理の考え方（100〜140文字）。才能と深層心理から判断した、無理なく自分のエネルギーを保つための習慣・マインド"
  },
  "spiritual": {
    "numerology_reading": "数秘${numerology}から読み解くこのひとの本質（120〜160文字）。数秘の象徴とこのひとの悩み・才能との接点を",
    "zodiac_reading": "${zodiac}から見たこのひとの特性と今のテーマ（120〜160文字）",
    "current_stage": "今このひとがいるステージの読み解き（120〜160文字）。スピリチュアル診断の回答を踏まえて",
    "universe_message": "運命がこのひとに伝えたいこと（200〜250文字）。スピリチュアル診断の回答を引用しながら、今この時期に必要なメッセージを温かく"
  },
  "roadmap": {
    "actions": [
      { "period": "今日", "action": "このひとの才能を使った目標への極小の最初の一歩・5分でできる（60〜80文字）" },
      { "period": "1週間以内", "action": "このひとの消耗パターンを考慮した持続可能な最初の習慣（60〜80文字）" },
      { "period": "1ヶ月以内", "action": "60〜80文字" },
      { "period": "3ヶ月以内", "action": "60〜80文字" },
      { "period": "半年以内", "action": "60〜80文字" },
      { "period": "1年以内", "action": "60〜80文字" }
    ],
    "encouragement": "目標に向かうこのひとへの一言（80〜100文字）。才能と深層心理から見えるこのひとの強みに触れた個別メッセージ"
  },
  "selfcare": {
    "selfcare_actions": [
      { "period": "今日", "action": "このひとの才能の副作用・消耗パターンを意識した自分を大切にするアクション（60〜80文字）" },
      { "period": "1週間以内", "action": "60〜80文字" },
      { "period": "1ヶ月以内", "action": "60〜80文字" },
      { "period": "3ヶ月以内", "action": "60〜80文字" },
      { "period": "半年以内", "action": "60〜80文字" },
      { "period": "1年以内", "action": "60〜80文字" }
    ],
    "manual": "このひとの取扱説明書（200〜250文字）。元気になる条件・消耗する条件・回復の方法を、深層心理診断を根拠に具体的に",
    "recovery_actions": ["疲れたときの回復アクション（30〜45文字）。深層心理・才能・特性に根ざした回復方法。一般論禁止。5つ"],
    "my_rules": ["大切にしていい自分のルール（30〜45文字）。深層心理診断から特定した厳しい自己ルールを緩めた形で。5つ"]
  },
  "inner_child": "インナーチャイルドへのメッセージ（250〜300文字）。過去の傷ついた小さな自分へ、今のあなた（ぽとりを通して）から語りかける温かいメッセージ。「あのころのあなたへ」という語り口で始める。深層心理診断から読み解いた具体的な傷・頑張りに触れながら、「もう大丈夫だよ」と伝える。letterとは別の締め方で終わる",
  "letter": "ぽとりからの手紙（300〜350文字）。書き出しに宛名は不要。本文から直接書き始め、「ぽとりより」で締める。才能×深層心理×スピリチュアルを統合した、このひとの本質に届くメッセージ"
}
JSONのみ返してください。`

        let accumulated = ''
        const emitted = new Set<FieldName>()
        const results = new Map<FieldName, unknown>()

        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 16000,
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
          console.error('[high-ticket stream] JSON.parse failed, using partial data')
          full = Object.fromEntries(results.entries())
        }

        for (const field of FIELD_ORDER) {
          if (!emitted.has(field) && full[field] !== undefined) {
            send({ field, value: full[field] })
          }
        }

        await adminClient.from('reports').upsert(
          { diagnosis_id: diagnosisId, user_id: null, type: 'high_ticket', content: full },
          { onConflict: 'diagnosis_id,type' }
        )

        send({ done: true })
        controller.close()
      } catch (err) {
        console.error('[high-ticket stream error]', err)
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
