import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'


export async function GET() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('diary_entries')
    .select('id, content, ai_content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { content, generateAi } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const adminClient = createAdminClient()

  let ai_content = ''
  if (generateAi) {
    // 診断データ取得
    const { data: diagnoses } = await adminClient
      .from('diagnoses').select('id, type').eq('user_id', user.id).order('created_at', { ascending: false })
    const freeDiag = diagnoses?.find(d => d.type === 'free')
    let typeName = ''
    if (freeDiag) {
      const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
      typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `あなたはCocoHareのAIカウンセラー「ぽとり」です。
ユーザーが書いた日記の内容をもとに、AIが温かく言語化した「ぽとり日記」を生成してください。

${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}

ユーザーの日記：
${content}

以下の条件で生成してください：
- ユーザーの気持ちや体験を深く言語化する
- 批判せず、共感と肯定を基調に
- 「あなたは今日〜」という語りかけ形式
- 150〜250文字
- 「です・ます」調

日記本文のみ返してください。`,
      }],
      max_tokens: 800,
    })
    ai_content = completion.choices[0].message.content?.trim() ?? ''
  }

  const { data, error } = await adminClient
    .from('diary_entries')
    .insert({ user_id: user.id, content, ai_content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}
