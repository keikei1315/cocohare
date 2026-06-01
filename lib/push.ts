import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  'mailto:contact@cocohare.jp',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const { data: subs } = await adminClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs?.length) return

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  )
}

export async function sendPushToAll(
  payload: PushPayload,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const { data: subs } = await adminClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (!subs?.length) return

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  )
}
