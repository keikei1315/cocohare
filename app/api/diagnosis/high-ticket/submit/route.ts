import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'


export async function POST(request: NextRequest) {
  try {
    const {
      stripeSessionId,
      freeDiagnosisId,
      strengthAnswers,
      deepPsychAnswers,
      spiritualAnswers,
      birthday,
      worries,
      goals,
    } = await request.json()

    if (
      !stripeSessionId ||
      !Array.isArray(strengthAnswers) || strengthAnswers.length !== 60 ||
      !Array.isArray(deepPsychAnswers) || deepPsychAnswers.length !== 12 ||
      !spiritualAnswers || !birthday || !worries || !goals
    ) {
      return NextResponse.json({ error: '入力データが不正です' }, { status: 400 })
    }

    // Stripe決済確認
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId)
    if (session.payment_status !== 'paid' || session.metadata?.type !== 'high_ticket') {
      return NextResponse.json({ error: '有効な決済が見つかりません' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // ログイン済みユーザーのIDを取得
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()

    // 診断レコード作成
    const { data: diagnosis, error: diagError } = await adminClient
      .from('diagnoses')
      .insert({
        user_id: user?.id ?? null,
        guest_session_id: null,
        type: 'high_ticket',
        version: 'v1',
        answers: {},
        scores: {},
        personality_type: null,
      })
      .select()
      .single()

    if (diagError || !diagnosis) {
      return NextResponse.json({ error: 'DB保存エラー' }, { status: 500 })
    }

    // 支払いレコード更新
    await adminClient
      .from('payments')
      .update({ status: 'completed', diagnosis_id: diagnosis.id })
      .eq('stripe_session_id', stripeSessionId)

    // 回答保存
    const { error: answerError } = await adminClient
      .from('high_ticket_answers')
      .upsert({
        diagnosis_id: diagnosis.id,
        strength_answers: strengthAnswers,
        deep_psych_answers: deepPsychAnswers,
        spiritual_answers: spiritualAnswers,
        birthday,
        worries,
        goals,
        source_free_diagnosis_id: freeDiagnosisId || null,
      }, { onConflict: 'diagnosis_id' })

    if (answerError) {
      return NextResponse.json({ error: 'DB保存エラー' }, { status: 500 })
    }

    return NextResponse.json({ diagnosisId: diagnosis.id })
  } catch (err) {
    console.error('[high-ticket submit error]', err)
    return NextResponse.json(
      { error: `処理に失敗しました: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
