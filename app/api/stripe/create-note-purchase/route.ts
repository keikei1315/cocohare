import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          unit_amount: 480,
          product_data: {
            name: 'じぶんノート 追加1冊',
            description: '月の上限を超えて、じぶんノートを1冊作成できます',
          },
        },
        quantity: 1,
      },
    ],
    metadata: { user_id: user.id, note_type: 'extra_note' },
    success_url: `${origin}/counseling/jibunn-note?note_purchased=1`,
    cancel_url: `${origin}/counseling/jibunn-note`,
  })

  return NextResponse.json({ url: session.url })
}
