import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { diagnosisId } = await request.json()

    if (!diagnosisId) {
      return NextResponse.json({ error: 'diagnosisIdが必要です' }, { status: 400 })
    }

    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    const adminClient = createAdminClient()

    // 診断の存在確認
    const { data: diagnosis } = await adminClient
      .from('diagnoses')
      .select('id')
      .eq('id', diagnosisId)
      .single()

    if (!diagnosis) {
      return NextResponse.json({ error: '診断が見つかりません' }, { status: 404 })
    }

    const origin = request.headers.get('origin') ?? 'http://localhost:3000'

    // 既に追加回答済みなら結果ページへ
    const { data: existing } = await adminClient
      .from('paid_diagnosis_answers')
      .select('id')
      .eq('diagnosis_id', diagnosisId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ url: `${origin}/diagnosis/free/result/${diagnosisId}` })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            unit_amount: 1480,
            product_data: {
              name: 'CocoHare 詳細レポート',
              description: 'しんどさの根っこ・回復のヒント・向いている働き方など6項目の詳細診断レポート',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: user?.email ?? undefined,
      metadata: { diagnosisId },
      success_url: `${origin}/diagnosis/paid/${diagnosisId}/questions?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/diagnosis/paid?diagnosisId=${diagnosisId}`,
    })

    // 支払いレコードを pending で作成
    await adminClient.from('payments').insert({
      diagnosis_id: diagnosisId,
      stripe_session_id: session.id,
      amount: 1480,
      status: 'pending',
      user_id: user?.id ?? null,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout error]', err)
    return NextResponse.json(
      { error: `処理に失敗しました: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
