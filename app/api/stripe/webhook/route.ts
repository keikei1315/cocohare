import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[webhook signature error]', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const diagnosisId = session.metadata?.diagnosisId
    const userId = session.metadata?.user_id
    const plan = session.metadata?.plan
    const noteType = session.metadata?.note_type

    if (diagnosisId) {
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null
      await adminClient
        .from('payments')
        .update({ status: 'completed', stripe_payment_intent_id: paymentIntentId })
        .eq('stripe_session_id', session.id)
    } else if (session.metadata?.type === 'high_ticket') {
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null
      const freeDiagnosisId = session.metadata?.freeDiagnosisId
      let htUserId: string | null = null
      if (freeDiagnosisId) {
        const { data: diag } = await adminClient.from('diagnoses').select('user_id').eq('id', freeDiagnosisId).maybeSingle()
        htUserId = diag?.user_id ?? null
      }
      await adminClient
        .from('payments')
        .update({ status: 'completed', stripe_payment_intent_id: paymentIntentId, user_id: htUserId, source_free_diagnosis_id: freeDiagnosisId || null })
        .eq('stripe_session_id', session.id)
    } else if (noteType === 'extra_note' && userId) {
      const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(userId)
      const currentCredits = (authUser?.user_metadata?.note_credits as number) ?? 0
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { note_credits: currentCredits + 1 },
      })
    } else if (userId) {
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
      const customerId = typeof session.customer === 'string' ? session.customer : null
      const interval = session.metadata?.interval ?? 'month'
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          subscribed: true,
          plan: plan ?? null,
          interval,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
        },
      })
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object
    const userId = subscription.metadata?.user_id
    const plan = subscription.metadata?.plan
    const interval = subscription.metadata?.interval ?? 'month'

    if (userId) {
      const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(userId)
      const meta = authUser?.user_metadata ?? {}
      const scheduledPlan = meta.scheduled_plan as string | undefined
      const scheduledInterval = (meta.scheduled_interval as string | undefined) ?? 'month'
      const scheduledEffectiveAt = meta.scheduled_plan_effective_at as number | undefined

      const periodStart = subscription.items.data[0]?.current_period_start ?? 0
      if (scheduledPlan && scheduledEffectiveAt && periodStart >= scheduledEffectiveAt) {
        // 予定されたダウングレードを適用
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: {
            subscribed: true,
            plan: scheduledPlan,
            interval: scheduledInterval,
            stripe_subscription_id: subscription.id,
            scheduled_plan: null,
            scheduled_interval: null,
            scheduled_plan_effective_at: null,
          },
        })
      } else if (plan && !scheduledPlan) {
        // アップグレード・新規などの通常同期
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: { subscribed: true, plan, interval, stripe_subscription_id: subscription.id },
        })
      }
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const userId = subscription.metadata?.user_id
    if (userId) {
      await adminClient.from('push_subscriptions').delete().eq('user_id', userId)
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { subscribed: false, plan: null, interval: null, stripe_subscription_id: null },
      })
    }
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
