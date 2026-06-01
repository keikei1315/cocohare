import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const AMOUNTS = {
  month: { ume: 480, take: 980, matsu: 1980 },
  year:  { ume: 4800, take: 9800, matsu: 19800 },
} as const

const PLAN_NAMES = {
  ume: 'ほっこりプラン', take: 'やすらぎプラン', matsu: 'ぬくもりプラン',
} as const

const PLAN_ORDER = { ume: 0, take: 1, matsu: 2 } as const

function isUpgrade(
  currentPlan: string, currentInterval: string,
  newPlan: string, newInterval: string,
): boolean {
  const currentRank = PLAN_ORDER[currentPlan as keyof typeof PLAN_ORDER] ?? 0
  const newRank = PLAN_ORDER[newPlan as keyof typeof PLAN_ORDER] ?? 0
  if (newRank > currentRank) return true
  if (newRank === currentRank && currentInterval === 'month' && newInterval === 'year') return true
  return false
}

async function resolveSubscriptionId(
  userId: string,
  email: string,
  storedId: string | undefined,
  adminClient: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>,
): Promise<string | null> {
  if (storedId) {
    // 保存済みIDが有効か確認
    try {
      const sub = await stripe.subscriptions.retrieve(storedId)
      if (sub.status === 'active' || sub.status === 'trialing') return storedId
    } catch {
      // 無効なIDなので以下でメール検索にフォールバック
    }
  }

  // メールからStripe customerを検索
  const customers = await stripe.customers.list({ email, limit: 5 })
  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })
    const sub = subs.data[0]
    if (sub) {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          stripe_subscription_id: sub.id,
          stripe_customer_id: customer.id,
        },
      })
      return sub.id
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan, interval } = await request.json()
    if (!plan || !interval) return NextResponse.json({ error: 'plan and interval required' }, { status: 400 })

    const amount = AMOUNTS[interval as keyof typeof AMOUNTS]?.[plan as keyof typeof AMOUNTS.month]
    if (!amount) return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })

    const meta = user.user_metadata
    const adminClient = createAdminClient()

    const subscriptionId = await resolveSubscriptionId(
      user.id,
      user.email!,
      meta?.stripe_subscription_id as string | undefined,
      adminClient,
    )
    if (!subscriptionId) {
      return NextResponse.json({ error: 'アクティブなサブスクリプションが見つかりませんでした。一度ページをリロードしてお試しください。' }, { status: 400 })
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items'] })
    const currentItem = subscription.items.data[0]
    if (!currentItem) {
      return NextResponse.json({ error: 'サブスクリプションアイテムが見つかりませんでした' }, { status: 400 })
    }

    const currentPlan = (meta?.plan as string) ?? 'ume'
    const currentInterval = (meta?.interval as string) ?? 'month'
    const prorationBehavior = isUpgrade(currentPlan, currentInterval, plan, interval)
      ? 'always_invoice'
      : 'create_prorations'

    // 新しいpriceを作成してからupdateに渡す（既存productが非アクティブの場合を回避）
    const newPrice = await stripe.prices.create({
      currency: 'jpy',
      unit_amount: amount,
      recurring: { interval: interval === 'year' ? 'year' : 'month' },
      product_data: { name: `CocoHare ${PLAN_NAMES[plan as keyof typeof PLAN_NAMES]}` },
    })

    const upgrade = isUpgrade(currentPlan, currentInterval, plan, interval)

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: currentItem.id, price: newPrice.id }],
      proration_behavior: upgrade ? 'always_invoice' : 'none',
      metadata: { user_id: user.id, plan, interval },
    })

    if (upgrade) {
      // アップグレード: 即時反映
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          subscribed: true,
          plan,
          interval,
          stripe_subscription_id: updated.id,
          scheduled_plan: null,
          scheduled_interval: null,
          scheduled_plan_effective_at: null,
        },
      })
    } else {
      // ダウングレード: 次回請求日まで現プランを維持し、予定として保存
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          stripe_subscription_id: updated.id,
          scheduled_plan: plan,
          scheduled_interval: interval,
          scheduled_plan_effective_at: currentItem.current_period_end,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      plan: upgrade ? plan : currentPlan,
      interval: upgrade ? interval : currentInterval,
      isUpgrade: upgrade,
      scheduledPlan: upgrade ? null : plan,
      scheduledAt: upgrade ? null : currentItem.current_period_end,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'サーバーエラーが発生しました'
    console.error('[update-subscription error]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
