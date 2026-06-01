import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  const redirectTo = searchParams.get('redirect_to') ?? '/'

  if (!sessionId) return NextResponse.redirect(`${origin}${redirectTo}`)

  try {
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }

    const email = stripeSession.customer_details?.email ?? stripeSession.customer_email
    if (!email) return NextResponse.redirect(`${origin}${redirectTo}`)

    const adminClient = createAdminClient()

    // ユーザー作成（既存の場合はエラーを無視）
    try {
      await adminClient.auth.admin.createUser({ email, email_confirm: true, user_metadata: { needs_password: true } })
    } catch { /* 既存ユーザーの場合は無視 */ }

    // マジックリンク生成
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
    })

    if (linkData?.properties?.action_link) {
      return NextResponse.redirect(linkData.properties.action_link)
    }
  } catch {
    // 失敗時はそのまま目的地へ
  }

  return NextResponse.redirect(`${origin}${redirectTo}`)
}
