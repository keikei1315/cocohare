import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerId = user.user_metadata?.stripe_customer_id as string | undefined
  if (!customerId) return NextResponse.json({ error: 'No subscription found' }, { status: 400 })

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/mypage`,
  })

  return NextResponse.json({ url: session.url })
}
