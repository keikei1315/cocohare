import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import SubscriptionSuccess from './client'

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (session_id) {
    const session = await stripe.checkout.sessions.retrieve(session_id)

    // ログイン済みかチェック（auth/callback経由で戻ってきた場合はスキップ）
    const serverClient = await createClient()
    const { data: { user: loggedInUser } } = await serverClient.auth.getUser()

    if (!session.metadata?.user_id && session.status === 'complete' && !loggedInUser) {
      const email = session.customer_details?.email
      if (email) {
        const plan = session.metadata?.plan ?? null
        const interval = session.metadata?.interval ?? 'month'
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
        const customerId = typeof session.customer === 'string' ? session.customer : null
        const adminClient = createAdminClient()
        const userMeta = { subscribed: true, plan, interval, stripe_subscription_id: subscriptionId, stripe_customer_id: customerId, needs_password: true }

        let userId: string | null = null
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: userMeta,
        })

        if (!createError && created?.user) {
          userId = created.user.id
        } else {
          const { data: { users } } = await adminClient.auth.admin.listUsers()
          const existing = users.find(u => u.email === email)
          if (existing) {
            userId = existing.id
            await adminClient.auth.admin.updateUserById(userId, { user_metadata: userMeta })
          }
        }

        if (userId) {
          if (subscriptionId) {
            await stripe.subscriptions.update(subscriptionId, {
              metadata: { user_id: userId, plan: plan ?? '', interval },
            })
          }

          const next = encodeURIComponent(`/subscription/success?session_id=${session_id}`)
          const { data: linkData } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: { redirectTo: '/' },
          })

          const hashedToken = linkData?.properties?.hashed_token ?? null
          if (hashedToken) redirect(`/api/auth/auto-login?token_hash=${hashedToken}&next=${next}`)
        }
      }
    }
  }

  return (
    <Suspense>
      <SubscriptionSuccess />
    </Suspense>
  )
}
