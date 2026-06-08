'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Plan = 'ume' | 'take' | 'matsu'
type Interval = 'month' | 'year'

const PLAN_ORDER: Record<Plan, number> = { ume: 0, take: 1, matsu: 2 }

const PLANS = [
  {
    id: 'ume' as Plan,
    name: 'ほっこり',
    monthly: 480,
    annual: 4800,
    concept: 'まず試したい人向け',
    features: ['AIとの会話（無制限）', '普通に話すモード'],
    color: '#FAA66B',
  },
  {
    id: 'take' as Plan,
    name: 'やすらぎ',
    monthly: 980,
    annual: 9800,
    concept: '日常的に使いたい人向け',
    features: [
      '普通に話す・カウンセリングモード',
      '毎日気分記録・感情ラベル',
      '日記（手書き＋AI自動生成）',
      '週間レポート・気分グラフ',
      'じぶんTODO（週5個）',
    ],
    color: '#F07B3A',
  },
  {
    id: 'matsu' as Plan,
    name: 'ぬくもり',
    monthly: 1480,
    annual: 14800,
    concept: '本格的に自己理解したい人向け',
    features: [
      'やすらぎプランの全機能',
      'コーチングモード',
      '月間レポート',
      'じぶんノート（月3冊）',
    ],
    color: '#C4612A',
  },
]

export default function SubscriptionClient({
  currentPlan,
  currentInterval,
  scheduledPlan,
  scheduledAt,
}: {
  currentPlan: string | null
  currentInterval: Interval
  scheduledPlan: string | null
  scheduledAt: number | null
}) {
  const router = useRouter()
  const isSubscribed = currentPlan !== null

  const [loading, setLoading] = useState<string | null>(null)
  const [interval, setInterval] = useState<Interval>(isSubscribed ? currentInterval : 'month')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pendingChange, setPendingChange] = useState<{ plan: Plan; interval: Interval; label: string } | null>(null)

  const safeJson = async (res: Response): Promise<Record<string, unknown>> => {
    try { return await res.json() } catch { return {} }
  }

  const handleNewSubscription = async (plan: Plan) => {
    setLoading(`new-${plan}`)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/stripe/create-counseling-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error((data.error as string) ?? 'エラーが発生しました')
      if (data.url) window.location.href = data.url as string
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'エラーが発生しました。もう一度お試しください。')
      setLoading(null)
    }
  }

  const handleUpdateSubscription = async (plan: Plan, targetInterval: Interval) => {
    const key = `update-${plan}-${targetInterval}`
    setLoading(key)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/stripe/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: targetInterval }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error((data.error as string) ?? 'エラーが発生しました')
      const supabase = createClient()
      await supabase.auth.refreshSession()
      setPendingChange(null)
      const planName = PLANS.find(p => p.id === plan)?.name ?? ''
      const intervalLabel = targetInterval === 'year' ? '年払い' : '月払い'
      if (data.isUpgrade === false) {
        const effectiveDate = data.scheduledAt
          ? new Date((data.scheduledAt as number) * 1000).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
          : '次回更新日'
        setSuccessMsg(`${effectiveDate}から${planName}プラン（${intervalLabel}）に変更されます`)
      } else {
        setSuccessMsg(`${planName}プラン（${intervalLabel}）に変更しました`)
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'エラーが発生しました。もう一度お試しください。')
      setLoading(null)
    }
  }

  const confirmDetails = pendingChange ? (() => {
    const p = PLANS.find(pl => pl.id === pendingChange.plan)!
    const price = pendingChange.interval === 'year' ? p.annual : p.monthly
    const currentRank = PLAN_ORDER[currentPlan as Plan] ?? -1
    const newRank = PLAN_ORDER[pendingChange.plan]
    const isUp = newRank > currentRank || (newRank === currentRank && currentInterval === 'month' && pendingChange.interval === 'year')
    return {
      planName: p.name,
      price,
      interval: pendingChange.interval,
      isUpgrade: isUp,
      color: p.color,
      note: isUp
        ? '残り日数分の差額が今すぐ請求されます。新しい機能はすぐにご利用いただけます。'
        : '今月末まで現在のプランをそのままご利用いただけます。次回更新日から新しいプランが適用されます。',
    }
  })() : null

  if (successMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <Image src="/potori/happy.png" alt="" width={64} height={64} className="object-contain mb-4" />
        <p className="text-lg font-bold mb-2" style={{ color: '#3F342D' }}>{successMsg}</p>
        <button
          onClick={() => router.push('/counseling/chat')}
          className="mt-4 px-6 py-3 rounded-xl font-bold text-white text-sm"
          style={{ backgroundColor: '#FAA66B' }}
        >
          ぽとりと話す
        </button>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="px-4 pt-10 max-w-sm mx-auto">

        <button onClick={() => router.back()} className="text-sm mb-6" style={{ color: '#FAA66B' }}>
          ← 戻る
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Image src="/potori/happy.png" alt="ぽとり" width={40} height={40} className="object-contain" />
          <h1 className="text-xl font-bold" style={{ color: '#3F342D' }}>
            {isSubscribed ? 'プランを変更する' : 'プランを選ぶ'}
          </h1>
        </div>
        {scheduledPlan && scheduledAt && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FFF3E0', border: '1px solid #FAA66B44' }}>
            <span style={{ fontWeight: 700, color: '#F07B3A' }}>ダウングレード予定：</span>
            <span style={{ color: '#3F342D' }}>
              {new Date(scheduledAt * 1000).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}から
              {PLANS.find(p => p.id === scheduledPlan)?.name ?? scheduledPlan}プランに変更されます
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
            {errorMsg}
          </div>
        )}

        <p className="text-sm mb-6" style={{ color: '#3F342D99' }}>
          {isSubscribed
            ? 'アップグレードは即時反映・日割り精算。ダウングレードは次回更新時に適用。'
            : '毎日のこころに、ぽとりを。'}
        </p>

        {/* 月払い / 年払い トグル */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex rounded-full p-1 gap-1" style={{ backgroundColor: '#F0E8E0' }}>
            {(['month', 'year'] as Interval[]).map(iv => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className="px-5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor: interval === iv ? '#fff' : 'transparent',
                  color: interval === iv ? '#3F342D' : '#3F342D66',
                  boxShadow: interval === iv ? '0 1px 4px rgba(63,52,45,0.12)' : 'none',
                }}
              >
                {iv === 'month' ? '月払い' : (
                  <>
                    年払い
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#FAA66B22', color: '#FAA66B' }}>
                      2ヶ月分お得
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {PLANS.map(plan => {
            const price = interval === 'year' ? plan.annual : plan.monthly
            const monthlyEq = interval === 'year' ? Math.floor(plan.annual / 12) : null
            const savings = interval === 'year' ? plan.monthly * 12 - plan.annual : null

            const isCurrent = isSubscribed && currentPlan === plan.id && currentInterval === interval
            const isCurrentPlanDiffInterval = isSubscribed && currentPlan === plan.id && currentInterval !== interval
            const currentRank = PLAN_ORDER[currentPlan as Plan] ?? -1
            const thisRank = PLAN_ORDER[plan.id]

            let buttonLabel = `${plan.name}プランにする`
            let buttonDisabled = false
            let buttonBg = plan.color
            let buttonColor = '#fff'

            if (isCurrent) {
              buttonLabel = '現在のプラン'
              buttonDisabled = true
              buttonBg = '#E5DDD8'
              buttonColor = '#3F342D66'
            } else if (isSubscribed) {
              if (isCurrentPlanDiffInterval && interval === 'year') {
                buttonLabel = '年払いに切り替える'
              } else if (isCurrentPlanDiffInterval && interval === 'month') {
                buttonLabel = '月払いに戻す'
                buttonBg = '#EDE5DC'
                buttonColor = '#3F342D'
              } else if (thisRank > currentRank) {
                buttonLabel = `${plan.name}プランにアップグレード`
              } else if (thisRank < currentRank) {
                buttonLabel = `${plan.name}プランにダウングレード`
                buttonBg = '#EDE5DC'
                buttonColor = '#3F342D'
              }
            }

            const loadingKey = isSubscribed ? `update-${plan.id}-${interval}` : `new-${plan.id}`
            const isLoading = loading === loadingKey

            return (
              <div
                key={plan.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#fff',
                  boxShadow: isCurrent ? `0 4px 20px ${plan.color}33` : '0 1px 6px rgba(63,52,45,0.06)',
                  border: isCurrent ? `2px solid ${plan.color}` : '2px solid transparent',
                }}
              >
                {isCurrent && (
                  <div className="text-xs text-center py-1.5 font-medium" style={{ backgroundColor: plan.color, color: '#fff' }}>
                    現在のプラン
                  </div>
                )}
                {!isSubscribed && plan.id === 'take' && (
                  <div className="text-xs text-center py-1.5 font-medium" style={{ backgroundColor: plan.color, color: '#fff' }}>
                    おすすめ
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-lg font-bold" style={{ color: '#3F342D' }}>{plan.name}プラン</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold" style={{ color: plan.color }}>¥{price.toLocaleString()}</span>
                      <span className="text-xs ml-1" style={{ color: '#3F342D66' }}>/{interval === 'year' ? '年' : '月'}</span>
                      {monthlyEq && (
                        <div className="text-xs mt-0.5" style={{ color: '#3F342D66' }}>
                          月あたり ¥{monthlyEq.toLocaleString()}
                          {savings && savings > 0 && (
                            <span className="ml-1" style={{ color: '#FAA66B' }}>（¥{savings.toLocaleString()}お得）</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs mb-4" style={{ color: '#3F342D66' }}>{plan.concept}</p>

                  <ul className="space-y-1.5 mb-5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#3F342D' }}>
                        <span style={{ color: plan.color }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => {
                      if (buttonDisabled || isLoading || loading !== null) return
                      if (isSubscribed) {
                        setPendingChange({ plan: plan.id, interval, label: buttonLabel })
                      } else {
                        handleNewSubscription(plan.id)
                      }
                    }}
                    disabled={buttonDisabled || isLoading || loading !== null}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                    style={isLoading
                      ? { backgroundColor: '#E5DDD8', color: '#3F342D66' }
                      : { backgroundColor: buttonBg, color: buttonColor }
                    }
                  >
                    {isLoading ? '処理中...' : buttonLabel}
                  </button>
                  {isSubscribed && !isCurrent && thisRank < (PLAN_ORDER[currentPlan as Plan] ?? -1) && (
                    <p className="text-xs text-center mt-2" style={{ color: '#3F342D55' }}>
                      次回更新日から適用・今月は現在のプランを継続
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: '#3F342D66' }}>
          いつでもキャンセル可能
        </p>
      </div>
    </div>

    {/* 確認モーダル */}
    {pendingChange && confirmDetails && (
      <div
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(63,52,45,0.4)', zIndex: 80, display: 'flex', alignItems: 'flex-end' }}
        onClick={() => setPendingChange(null)}
      >
        <div
          style={{ width: '100%', backgroundColor: '#FFF9F5', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ width: '36px', height: '4px', backgroundColor: '#E0D8D0', borderRadius: '2px', margin: '0 auto 20px' }} />

          <p style={{ fontSize: '11px', fontWeight: 700, color: confirmDetails.color, letterSpacing: '0.06em', marginBottom: '6px' }}>
            {confirmDetails.isUpgrade ? 'アップグレード' : 'ダウングレード'}
          </p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#3F342D', marginBottom: '4px' }}>
            {confirmDetails.planName}プラン（{confirmDetails.interval === 'year' ? '年払い' : '月払い'}）
          </p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: confirmDetails.color, marginBottom: '12px' }}>
            ¥{confirmDetails.price.toLocaleString()}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#3F342D66' }}>/{confirmDetails.interval === 'year' ? '年' : '月'}</span>
          </p>

          <div style={{ backgroundColor: '#F5EFE9', borderRadius: '12px', padding: '12px 14px', marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: '#3F342D', lineHeight: 1.6 }}>{confirmDetails.note}</p>
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: '#FEE2E2', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
              <p style={{ fontSize: '13px', color: '#B91C1C' }}>{errorMsg}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { setPendingChange(null); setErrorMsg(null) }}
              style={{ flex: 1, padding: '14px', borderRadius: '14px', backgroundColor: '#F0E8E0', fontSize: '14px', fontWeight: 700, color: '#3F342D' }}
            >
              キャンセル
            </button>
            <button
              onClick={() => handleUpdateSubscription(pendingChange.plan, pendingChange.interval)}
              disabled={loading !== null}
              style={{
                flex: 2, padding: '14px', borderRadius: '14px',
                backgroundColor: loading ? '#E5DDD8' : confirmDetails.color,
                fontSize: '14px', fontWeight: 700,
                color: loading ? '#3F342D66' : '#fff',
              }}
            >
              {loading ? '処理中...' : `${pendingChange.label}`}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
