import { createClient } from '@/lib/supabase/server'
import SubscriptionClient from './client'

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <SubscriptionClient
        currentPlan={null}
        currentInterval="month"
        scheduledPlan={null}
        scheduledAt={null}
      />
    )
  }

  const meta = user.user_metadata
  const currentPlan = (meta?.plan as string) ?? null
  const currentInterval = (meta?.interval as string) ?? 'month'
  const isSubscribed = meta?.subscribed === true
  const scheduledPlan = (meta?.scheduled_plan as string) ?? null
  const scheduledAt = (meta?.scheduled_plan_effective_at as number) ?? null

  return (
    <SubscriptionClient
      currentPlan={isSubscribed ? currentPlan : null}
      currentInterval={currentInterval as 'month' | 'year'}
      scheduledPlan={scheduledPlan}
      scheduledAt={scheduledAt}
    />
  )
}
