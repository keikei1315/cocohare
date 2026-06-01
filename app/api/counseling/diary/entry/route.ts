import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const adminClient = createAdminClient()
  const { data: entry } = await adminClient
    .from('diary_entries')
    .select('id, content, ai_content, mood_level, positive_entries, diary_date')
    .eq('user_id', user.id)
    .eq('diary_date', date)
    .maybeSingle()

  return NextResponse.json({ entry })
}

export async function POST(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { date, content, mood_level, positive_entries, generateAi } = await request.json()
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const adminClient = createAdminClient()

  let ai_content = ''
  if (generateAi && content?.trim()) {
    const { data: diagnoses } = await adminClient
      .from('diagnoses').select('id, type').eq('user_id', user.id).order('created_at', { ascending: false })
    const freeDiag = diagnoses?.find(d => d.type === 'free')
    let typeName = ''
    if (freeDiag) {
      const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
      typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{
        role: 'user',
        content: `ユーザーが書いた今日の日記をもとに、「ぽとり日記」を生成してください。
ぽとり日記とは、出来事の羅列ではなく、その日の心の動きや体験の本質を
詩的・内省的な言葉で捉え直した日記です。

${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}
気分：${mood_level ?? '未記録'}
日付：${date}

ユーザーの日記：
${content}

【生成ルール】
・「今日は〜」という一人称（ユーザー視点）で書く
・「あなた」「きみ」などの二人称は絶対に使わない
・出来事の要約ではなく、その日の心の動きや気づきを中心に書く
・ユーザーの日記にない出来事・事実は創作しない
・ありきたりな感情語（「疲れた」「嬉しかった」）より、
  その気持ちの奥にある質感を言葉にする（例：「静かに消耗していた」「じわっと嬉しかった」）
・感情や体験の本質を深めるが、断定・決めつけはしない
・「です・ます」調 / 150〜250文字

日記本文のみ返してください。`,
      }],
    })
    ai_content = completion.choices[0].message.content?.trim() ?? ''
  }

  // Upsert by diary_date
  const { data, error } = await adminClient
    .from('diary_entries')
    .upsert(
      {
        user_id: user.id,
        diary_date: date,
        content: content?.trim() ?? '',
        ai_content,
        mood_level: mood_level ?? null,
        positive_entries: positive_entries ?? [],
      },
      { onConflict: 'user_id,diary_date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also record mood in mood_records if mood_level provided
  if (mood_level) {
    const scoreMap: Record<string, number> = { '良かった': 5, '普通': 3, '悪かった': 1 }
    const score = scoreMap[mood_level]
    if (score) {
      const dayStart = `${date}T00:00:00`
      const dayEnd = `${date}T23:59:59`
      const { data: existing } = await adminClient
        .from('mood_records')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .maybeSingle()

      if (!existing) {
        await adminClient.from('mood_records').insert({
          user_id: user.id,
          mood_score: score,
          emotion_labels: [],
          note: `日記より記録 (${mood_level})`,
        })
      }
    }
  }

  return NextResponse.json({ entry: data })
}
