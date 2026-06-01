import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const FULL_PRICE = 4960
const DISCOUNT_AMOUNT = 1480
const SECOND_TIME_PRICE = 1990

export async function POST(request: NextRequest) {
  try {
    const { freeDiagnosisId, checkOnly, isSecondTime } = await request.json()
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    const adminClient = createAdminClient()
    const origin = request.headers.get('origin') ?? 'http://localhost:3000'

    // 2回目購入（localStorageで判定済み）
    if (isSecondTime) {
      if (checkOnly) return NextResponse.json({ isSecondTime: true, amount: SECOND_TIME_PRICE })

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'jpy',
            unit_amount: SECOND_TIME_PRICE,
            product_data: {
              name: 'CocoHare 完全版自己分析レポート（再受診）',
              description: '才能診断60問・深層心理診断・スピリチュアル診断を統合した完全個別レポート（5種類）',
            },
          },
          quantity: 1,
        }],
        customer_email: user?.email ?? undefined,
        metadata: { type: 'high_ticket', freeDiagnosisId: freeDiagnosisId ?? '', discountApplied: 'false' },
        success_url: `${origin}/diagnosis/high-ticket/questions?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/diagnosis/high-ticket`,
      })
      await adminClient.from('payments').insert({
        diagnosis_id: freeDiagnosisId || null,
        stripe_session_id: session.id,
        amount: SECOND_TIME_PRICE,
        status: 'pending',
        user_id: user?.id ?? null,
        product: 'high_ticket',
      })
      return NextResponse.json({ url: session.url, amount: SECOND_TIME_PRICE })
    }

    // ¥1,480購入済み割引チェック（有料診断の支払いのみ対象。高額診断の支払いは除外）
    let hasDiscount = false
    if (freeDiagnosisId) {
      const { data: payments } = await adminClient
        .from('payments')
        .select('id')
        .eq('diagnosis_id', freeDiagnosisId)
        .eq('status', 'completed')
        .is('product', null)
        .limit(1)
      hasDiscount = !!(payments && payments.length > 0)
    }

    const amount = hasDiscount ? FULL_PRICE - DISCOUNT_AMOUNT : FULL_PRICE

    if (checkOnly) return NextResponse.json({ hasDiscount, amount })

    const priceLabel = hasDiscount
      ? 'CocoHare 完全版自己分析レポート（¥1,480割引適用）'
      : 'CocoHare 完全版自己分析レポート'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          unit_amount: amount,
          product_data: {
            name: priceLabel,
            description: '才能診断60問・深層心理診断・スピリチュアル診断を統合した完全個別レポート（5種類）',
          },
        },
        quantity: 1,
      }],
      customer_email: user?.email ?? undefined,
      metadata: { type: 'high_ticket', freeDiagnosisId: freeDiagnosisId ?? '', discountApplied: hasDiscount ? 'true' : 'false' },
      success_url: `${origin}/diagnosis/high-ticket/questions?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/diagnosis/high-ticket${freeDiagnosisId ? `?freeId=${freeDiagnosisId}` : ''}`,
    })
    await adminClient.from('payments').insert({
      diagnosis_id: freeDiagnosisId || null,
      stripe_session_id: session.id,
      amount,
      status: 'pending',
      user_id: user?.id ?? null,
      product: 'high_ticket',
    })
    return NextResponse.json({ url: session.url, hasDiscount, amount })
  } catch (err) {
    console.error('[create-checkout-high-ticket error]', err)
    return NextResponse.json(
      { error: `処理に失敗しました: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
