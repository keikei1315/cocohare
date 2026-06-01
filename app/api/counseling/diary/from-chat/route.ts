import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const adminClient = createAdminClient()
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  // 今日の会話履歴を取得
  const { data: messages } = await adminClient
    .from('counseling_messages')
    .select('role, content, created_at')
    .eq('user_id', user.id)
    .gte('created_at', todayStart)
    .lt('created_at', tomorrowStart)
    .order('created_at', { ascending: true })

  if (!messages || messages.length === 0) {
    return NextResponse.json({ content: null, reason: 'no_chat_today' })
  }

  // 性格タイプ取得
  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', user.id).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find(d => d.type === 'free')
  let typeName = ''
  if (freeDiag) {
    const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
    typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
  }

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'あなた' : 'ぽとり'}：${m.content}`)
    .join('\n')

  const completion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [{
      role: 'user',
      content: `今日の出来事と気持ちを振り返る日記を書いてください。
以下の会話ログ（user発言のみ有効）を参考にしてください。

${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}

【最優先】
・会話のやり取り自体を日記の主題にしない
・「〜と話した」「〜と言った」など会話への直接言及は禁止
・会話内容は、心情を推定するための材料としてのみ使う
・日記本文は「その日の生活」「体調・気分」「考えていたこと」を中心に書く

【情報の扱い】
・事実として使えるのはuser発言のみ
・assistant（ぽとり）の発言内容は一切書かない
・ログにない具体的事実（店名・場所・人物・出来事）は創作しない
・user発言から妥当に言える範囲で心理背景は要約してよい

【文体】
・一人称は「わたし」
・自然で落ち着いた文章
・子どもっぽい言い回し、擬音、ポエム調、過剰な比喩は禁止
・断定しすぎず、現実的な語り口

【構成（固定）】
・段落間は空行1行
・全体180文字以内

【禁止表現】
・「ぽとりに言った」「話した」「会話で」などの会話言及
・ポエム調、エッセイ調にしない
・一文字返信など会話ログの生再現

今日の会話ログ：
${conversationText}

日記本文のみを出力すること`,
    }],
  })

  const content = completion.choices[0].message.content?.trim() ?? ''
  return NextResponse.json({ content })
}
