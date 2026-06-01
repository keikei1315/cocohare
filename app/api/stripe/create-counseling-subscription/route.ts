import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // auth is optional — non-logged-in users can subscribe and get auto-registered on success

  const { plan, interval = 'month' } = await request.json() // 'ume' | 'take' | 'matsu', 'month' | 'year'
  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  const MONTHLY = {
    ume:   { amount: 480,   name: 'ほっこりプラン', desc: 'AIとの会話（無制限）・カウンセリングモード' },
    take:  { amount: 980,   name: 'やすらぎプラン', desc: '日記・気分記録・週間レポート・じぶんTODO' },
    matsu: { amount: 1980,  name: 'ぬくもりプラン', desc: '月間レポート・月次振り返りセッション・じぶんノート' },
  } as const
  const ANNUAL = {
    ume:   { amount: 4800,  name: 'ほっこりプラン（年間）', desc: 'AIとの会話（無制限）・カウンセリングモード' },
    take:  { amount: 9800,  name: 'やすらぎプラン（年間）', desc: '日記・気分記録・週間レポート・じぶんTODO' },
    matsu: { amount: 19800, name: 'ぬくもりプラン（年間）', desc: '月間レポート・月次振り返りセッション・じぶんノート' },
  } as const

  const PLANS = interval === 'year' ? ANNUAL : MONTHLY
  const selected = PLANS[plan as keyof typeof PLANS]
  if (!selected) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    ...(user?.email ? { customer_email: user.email } : {}),
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          recurring: { interval: interval === 'year' ? 'year' : 'month' },
          unit_amount: selected.amount,
          product_data: { name: `CocoHare ${selected.name}`, description: selected.desc },
        },
        quantity: 1,
      },
    ],
    metadata: { ...(user ? { user_id: user.id } : {}), plan, interval },
    subscription_data: { metadata: { ...(user ? { user_id: user.id } : {}), plan, interval } },
    success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscription`,
  })

  return NextResponse.json({ url: session.url })
}
