import { redirect } from 'next/navigation'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export default async function FreeRetryPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) redirect('/diagnosis/free')

  const stripeSession = await stripe.checkout.sessions.retrieve(session_id)
  if (stripeSession.payment_status !== 'paid' || stripeSession.metadata?.type !== 'free_retry') {
    redirect('/diagnosis/free')
  }

  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()

  if (!user) {
    const email = stripeSession.customer_details?.email ?? stripeSession.customer_email
    if (email) {
      const adminClient = createAdminClient()
      try {
        try {
          await adminClient.auth.admin.createUser({ email, email_confirm: true, user_metadata: { needs_password: true } })
        } catch { /* 既存ユーザーの場合は無視 */ }

        const { data: linkData } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: '/' },
        })
        const hashedToken = linkData?.properties?.hashed_token ?? null
        if (hashedToken) {
          const next = encodeURIComponent('/diagnosis/free?retry_ok=1')
          redirect(`/api/auth/auto-login?token_hash=${hashedToken}&next=${next}`)
        }
      } catch { /* 自動登録失敗でもそのまま遷移 */ }
    }
  }

  redirect('/diagnosis/free?retry_ok=1')
}
