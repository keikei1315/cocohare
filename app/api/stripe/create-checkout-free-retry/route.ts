import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin') ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          unit_amount: 290,
          product_data: {
            name: 'CocoHare 無料診断（再受診）',
            description: '性格タイプ・強み・エネルギーの傾向を診断するレポート',
          },
        },
        quantity: 1,
      }],
      metadata: { type: 'free_retry' },
      success_url: `${origin}/diagnosis/free/retry?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/diagnosis/free`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout-free-retry error]', err)
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 })
  }
}
