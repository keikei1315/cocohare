import { notFound, redirect } from 'next/navigation'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import HighTicketQuestionsClient from './client'

export default async function HighTicketQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) return notFound()

  const session = await stripe.checkout.sessions.retrieve(session_id)
  if (session.payment_status !== 'paid') return notFound()
  if (session.metadata?.type !== 'high_ticket') return notFound()

  const adminClient = createAdminClient()
  const freeDiagnosisId = session.metadata.freeDiagnosisId || null

  // 既に回答済みなら結果ページへ
  const { data: existingPayment } = await adminClient
    .from('payments')
    .select('diagnosis_id, product, status')
    .eq('stripe_session_id', session_id)
    .maybeSingle()

  // Stripe確認済みなのでDB状態を同期（webhookが届かない環境でも補完）
  const paymentUpdates: Record<string, unknown> = {}
  if (existingPayment?.status !== 'completed') paymentUpdates.status = 'completed'
  if (freeDiagnosisId && !existingPayment?.diagnosis_id) paymentUpdates.diagnosis_id = freeDiagnosisId
  if (!existingPayment?.product) paymentUpdates.product = 'high_ticket'
  if (Object.keys(paymentUpdates).length > 0) {
    await adminClient
      .from('payments')
      .update(paymentUpdates)
      .eq('stripe_session_id', session_id)
  }

  if (existingPayment?.diagnosis_id) {
    const { data: existing } = await adminClient
      .from('high_ticket_answers')
      .select('id')
      .eq('diagnosis_id', existingPayment.diagnosis_id)
      .maybeSingle()
    if (existing) {
      redirect(`/diagnosis/high-ticket/${existingPayment.diagnosis_id}/result`)
    }
  }

  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()

  // 未ログインなら自動登録 → サーバーサイドverifyOtp経由でセッションをCookieに設定してから戻る
  let autoLoginToken: string | null = null

  if (!user) {
    const email = session.customer_details?.email ?? session.customer_email
    if (email) {
      try {
        try {
          await adminClient.auth.admin.createUser({ email, email_confirm: true, user_metadata: { needs_password: true } })
        } catch { /* 既存ユーザーの場合は無視 */ }

        const next = encodeURIComponent(`/diagnosis/high-ticket/questions?session_id=${session_id}`)
        const { data: linkData } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: '/' },
        })
        const hashedToken = linkData?.properties?.hashed_token ?? null
        if (hashedToken) autoLoginToken = `${hashedToken}|${next}`
      } catch { /* 自動登録失敗でも設問は表示する */ }
    }
  }

  if (autoLoginToken) {
    const [token, next] = autoLoginToken.split('|')
    redirect(`/api/auth/auto-login?token_hash=${token}&next=${next}`)
  }

  return (
    <HighTicketQuestionsClient
      stripeSessionId={session_id}
      freeDiagnosisId={freeDiagnosisId}
    />
  )
}
