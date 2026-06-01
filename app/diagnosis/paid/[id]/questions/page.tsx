import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import PaidQuestionsClient from './client'

export default async function PaidQuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const { id } = await params
  const { session_id } = await searchParams
  const supabase = createAdminClient()

  // 支払い確認 (DB)
  const { data: payments } = await supabase
    .from('payments')
    .select('status')
    .eq('diagnosis_id', id)
    .eq('status', 'completed')
    .limit(1)

  if (!payments || payments.length === 0) {
    if (!session_id) return notFound()
    const session = await stripe.checkout.sessions.retrieve(session_id)
    if (session.payment_status !== 'paid') return notFound()
    if (session.metadata?.diagnosisId !== id) return notFound()
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('diagnosis_id', id)
  }

  // 既に追加20問が回答済みなら結果ページへ
  const { data: existing } = await supabase
    .from('paid_diagnosis_answers')
    .select('id')
    .eq('diagnosis_id', id)
    .maybeSingle()
  if (existing) redirect(`/diagnosis/free/result/${id}`)

  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()

  // ログイン済みなら無料診断を user_id に紐付け
  if (user) {
    await supabase
      .from('diagnoses')
      .update({ user_id: user.id })
      .eq('id', id)
      .is('user_id', null)
  }

  // 未ログインなら自動登録 → サーバーサイドverifyOtp経由でセッションをCookieに設定してから戻る
  let autoLoginToken: string | null = null

  if (!user && session_id) {
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(session_id)
      const email = stripeSession.customer_details?.email ?? stripeSession.customer_email
      if (email) {
        try {
          await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { needs_password: true } })
        } catch { /* 既存ユーザーの場合は無視 */ }

        const next = encodeURIComponent(`/diagnosis/paid/${id}/questions?session_id=${session_id}`)
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: '/' },
        })
        const hashedToken = linkData?.properties?.hashed_token ?? null
        if (hashedToken) autoLoginToken = `${hashedToken}|${next}`
      }
    } catch { /* 自動登録失敗でも設問は表示する */ }
  }

  if (autoLoginToken) {
    const [token, next] = autoLoginToken.split('|')
    redirect(`/api/auth/auto-login?token_hash=${token}&next=${next}`)
  }

  return <PaidQuestionsClient diagnosisId={id} />
}
