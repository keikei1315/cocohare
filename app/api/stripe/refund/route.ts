import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { payment_id, answers } = await request.json()
    if (!payment_id || !answers) return NextResponse.json({ error: 'payment_id and answers are required' }, { status: 400 })

    const adminClient = createAdminClient()

    // このユーザーは既に返金済みか
    const { data: existingRefund } = await adminClient
      .from('refund_requests')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (existingRefund) return NextResponse.json({ error: 'already_refunded' }, { status: 409 })

    // 支払い情報取得
    const { data: payment } = await adminClient
      .from('payments')
      .select('id, amount, created_at, status, stripe_payment_intent_id, stripe_session_id, diagnosis_id, user_id')
      .eq('id', payment_id)
      .single()

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.status === 'refunded') return NextResponse.json({ error: 'already_refunded' }, { status: 409 })
    if (payment.status !== 'completed') return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })

    // ユーザー所有確認
    let isOwner = payment.user_id === user.id
    if (!isOwner && payment.diagnosis_id) {
      const { data: diag } = await adminClient.from('diagnoses').select('user_id').eq('id', payment.diagnosis_id).single()
      isOwner = diag?.user_id === user.id
    }
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 7日以内チェック
    const diffDays = (Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays > 7) return NextResponse.json({ error: 'refund_period_expired' }, { status: 400 })

    // payment_intent_id取得（なければStripeから）
    let paymentIntentId = payment.stripe_payment_intent_id
    if (!paymentIntentId && payment.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id)
      paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null
    }
    if (!paymentIntentId) return NextResponse.json({ error: 'Payment intent not found' }, { status: 400 })

    // Stripe返金
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
    })

    // 返金履歴保存
    await adminClient.from('refund_requests').insert({
      user_id: user.id,
      payment_id: payment.id,
      stripe_payment_intent_id: paymentIntentId,
      amount: payment.amount,
      stripe_refund_id: refund.id,
      answers,
    })

    // 支払いステータス更新
    await adminClient.from('payments').update({ status: 'refunded' }).eq('id', payment.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[refund error]', err)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}
