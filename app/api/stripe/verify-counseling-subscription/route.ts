import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id } = await request.json()
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const session = await stripe.checkout.sessions.retrieve(session_id)

  if (session.status !== 'complete') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
  }

  if (session.metadata?.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const plan = session.metadata?.plan ?? null
  const interval = session.metadata?.interval ?? 'month'
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
  const customerId = typeof session.customer === 'string' ? session.customer : null
  const adminClient = createAdminClient()

  await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      subscribed: true,
      plan,
      interval,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
    },
  })

  return NextResponse.json({ ok: true, plan })
}
