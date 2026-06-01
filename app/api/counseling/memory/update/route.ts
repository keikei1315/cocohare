import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type ProfileFact = { fact: string; expires_at: string }
type SessionSummary = { date: string; summary: string }

const MAX_SESSION_SUMMARIES = 10

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'missing user_id' }, { status: 400 })

    const adminClient = createAdminClient()

    // 直近20件のメッセージを取得（要約対象）
    const { data: messages } = await adminClient
      .from('counseling_messages')
      .select('role, content, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!messages || messages.length < 10) return NextResponse.json({ skipped: true })

    const conversation = messages.reverse().map(m => `${m.role === 'user' ? 'ユーザー' : 'ぽとり'}: ${m.content}`).join('\n')

    // 既存のメモリを取得
    const { data: existing } = await adminClient
      .from('user_memories')
      .select('profile_facts, session_summaries')
      .eq('user_id', user_id)
      .maybeSingle()

    const now = new Date()
    const existingFacts: ProfileFact[] = (existing?.profile_facts ?? []).filter(
      (f: ProfileFact) => new Date(f.expires_at) > now
    )
    const existingSummaries: SessionSummary[] = existing?.session_summaries ?? []

    // GPTで要約＋ファクト抽出
    const result = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'user',
          content: `以下のカウンセリング会話を分析し、ユーザーの理解に役立つ情報をJSONで返してください。

会話：
${conversation}

既知の事実：
${existingFacts.map(f => `・${f.fact}`).join('\n') || 'なし'}

【summary】
この会話セッションの核心を100文字以内で要約してください。
ユーザーが話したこと・感じたことの中心を一言で捉えること。

【new_facts】
以下のルールで、長期的に記録すべき新しい事実を最大5件抽出してください：
・対象：仕事・生活環境・人間関係・悩みの構造・価値観・繰り返し出てくるテーマなど
・除外：今日だけの感情、一時的な出来事、すでに既知の事実と重複する内容
・表現：「〜という傾向がある」「〜が継続的な悩みになっている」「〜な環境にいる」など
・該当なければ空配列

JSONのみ返してください:
{"summary": "", "new_facts": []}`,
        },
      ],
    })

    let parsed: { summary?: string; new_facts?: string[] } = {}
    try {
      const raw = result.choices[0].message.content ?? ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')
    } catch { /* fallback */ }
    const summary: string = parsed.summary ?? ''
    const newFacts: string[] = parsed.new_facts ?? []

    // 新しいセッションサマリーを追加
    const newSummary: SessionSummary = {
      date: now.toISOString().split('T')[0],
      summary,
    }
    let updatedSummaries = [...existingSummaries, newSummary]

    // 上限超えたら古いサマリーをプロフィールに吸収
    let updatedFacts = [...existingFacts]
    if (updatedSummaries.length > MAX_SESSION_SUMMARIES) {
      const oldest = updatedSummaries.shift()
      if (oldest) {
        const absorption = await openai.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'user',
              content: `以下の会話サマリーから、ユーザーの長期プロフィールとして記録すべき情報を抽出してください。
一時的な感情ではなく、継続的に当てはまりそうな傾向・状況・価値観のみ抽出してください。

${oldest.summary}

JSONのみ返してください: {"facts": ["事実1", "事実2"]}
該当なければ: {"facts": []}`,
            },
          ],
        })
        let absorbedParsed: { facts?: string[] } = { facts: [] }
        try {
          const raw = absorption.choices[0].message.content ?? ''
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          absorbedParsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{"facts":[]}')
        } catch { /* fallback */ }
        const absorbed: string[] = absorbedParsed.facts ?? []
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        absorbed.forEach(fact => {
          if (!updatedFacts.some(f => f.fact === fact)) {
            updatedFacts.push({ fact, expires_at: expiresAt })
          }
        })
      }
    }

    // 新しいファクトを追加（期限は登録から1年）
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    newFacts.forEach(fact => {
      if (!updatedFacts.some(f => f.fact === fact)) {
        updatedFacts.push({ fact, expires_at: expiresAt })
      }
    })

    await adminClient
      .from('user_memories')
      .upsert({
        user_id,
        profile_facts: updatedFacts,
        session_summaries: updatedSummaries,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[memory update error]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
