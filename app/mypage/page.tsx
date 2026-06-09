import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ManagePlanButton from '@/app/components/ManagePlanButton'
import DiagnosisHistory from '@/app/components/DiagnosisHistory'
import PurchaseHistory, { type PurchaseItem } from '@/app/components/PurchaseHistory'
import LogoutButton from '@/app/components/LogoutButton'

export default async function MyPage() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()

  if (!user) redirect('/login?redirect=/mypage')

  const adminClient = createAdminClient()

  const { data: diagnoses } = await adminClient
    .from('diagnoses')
    .select('id, type, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const allDiagnoses = diagnoses ?? []
  const freeDiagnoses = allDiagnoses.filter(d => d.type === 'free')
  const htDiagnoses = allDiagnoses.filter(d => d.type === 'high_ticket')
  const freeDiagnosisIds = freeDiagnoses.map(d => d.id)

  // ¥1,480詳細レポート購入済みIDセット
  let paidIds = new Set<string>()
  if (freeDiagnosisIds.length > 0) {
    const { data: paidAnswers } = await adminClient
      .from('paid_diagnosis_answers')
      .select('diagnosis_id')
      .in('diagnosis_id', freeDiagnosisIds)
    paidIds = new Set((paidAnswers ?? []).map(a => a.diagnosis_id))
  }

  // 完全版診断（¥3,980）と紐付いている無料診断IDセット・HT診断IDセット
  let htLinkedFreeIds = new Set<string>()
  let htLinkedDiagnosisIds = new Set<string>()
  if (freeDiagnosisIds.length > 0) {
    const { data: htAnswers } = await adminClient
      .from('high_ticket_answers')
      .select('source_free_diagnosis_id, diagnosis_id')
      .in('source_free_diagnosis_id', freeDiagnosisIds)
    htLinkedFreeIds = new Set(
      (htAnswers ?? [])
        .map(a => a.source_free_diagnosis_id)
        .filter(Boolean) as string[]
    )
    htLinkedDiagnosisIds = new Set(
      (htAnswers ?? [])
        .map(a => a.diagnosis_id)
        .filter(Boolean) as string[]
    )
  }

  // 購入履歴（返金対象：¥1,480 と ¥4,960 / 旧¥3,980）
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  // user_id直接リンクの支払い
  const { data: directPayments } = await adminClient
    .from('payments')
    .select('id, amount, created_at, status')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .in('amount', [1480, 2500, 3480, 3980, 4960])

  // diagnosis経由の支払い（user_idが未設定の旧データ）
  let diagPayments: Array<{ id: string; amount: number; created_at: string; status: string; diagnosis_id: string | null }> = []
  if (freeDiagnosisIds.length > 0) {
    const { data } = await adminClient
      .from('payments')
      .select('id, amount, created_at, status, diagnosis_id')
      .in('diagnosis_id', freeDiagnosisIds)
      .eq('status', 'completed')
      .in('amount', [1480, 2500, 3480, 3980, 4960])
      .is('user_id', null)
    diagPayments = data ?? []
  }

  // 重複除去してマージ
  const allPaymentsMap = new Map<string, { id: string; amount: number; created_at: string; status: string }>()
  for (const p of [...(directPayments ?? []), ...diagPayments]) {
    allPaymentsMap.set(p.id, p)
  }

  // 返金済みかチェック
  const { data: existingRefund } = await adminClient
    .from('refund_requests')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  const hasExistingRefund = !!existingRefund

  const purchaseItems: PurchaseItem[] = [...allPaymentsMap.values()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(p => ({
      id: p.id,
      amount: p.amount,
      created_at: p.created_at,
      label: p.amount === 1480 ? '詳細レポート' : '完全版レポート',
      refundable: now - new Date(p.created_at).getTime() <= sevenDaysMs,
    }))

  // 無料診断 + 単体完全版をまとめて日付順に並べる
  type DiagItem = {
    id: string
    date: string
    badge: 'full' | 'detail' | 'free' | 'ht_standalone'
    href: string
  }

  const items: DiagItem[] = [
    ...freeDiagnoses.map(d => ({
      id: d.id,
      date: d.created_at,
      badge: htLinkedFreeIds.has(d.id)
        ? 'full' as const
        : paidIds.has(d.id)
          ? 'detail' as const
          : 'free' as const,
      href: `/diagnosis/free/result/${d.id}`,
    })),
    ...htDiagnoses
      .filter(d => !htLinkedDiagnosisIds.has(d.id))
      .map(d => ({
        id: d.id,
        date: d.created_at,
        badge: 'ht_standalone' as const,
        href: `/diagnosis/high-ticket/${d.id}/result`,
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const PLAN_LABELS: Record<string, string> = {
    ume: 'ほっこりプラン',
    take: 'やすらぎプラン',
    matsu: 'ぬくもりプラン',
  }
  const INTERVAL_LABELS: Record<string, string> = {
    month: '月払い',
    year: '年払い',
  }
  const planKey = user.user_metadata?.plan as string | undefined
  const intervalKey = user.user_metadata?.interval as string | undefined
  const planLabel = planKey ? PLAN_LABELS[planKey] ?? planKey : null
  const intervalLabel = intervalKey ? INTERVAL_LABELS[intervalKey] ?? intervalKey : null

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="px-4 pt-10 pb-6 max-w-sm mx-auto">
        <div className="flex justify-center mb-4">
          <Image src="/potori/happy.webp" alt="ぽとり" width={70} height={70} className="object-contain" />
        </div>
        <h1 className="text-lg font-bold text-center mb-1" style={{ color: '#3F342D' }}>マイページ</h1>
        <p className="text-xs text-center mb-8" style={{ color: '#3F342D66' }}>{user.email}</p>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium mb-3" style={{ color: '#FAA66B' }}>診断履歴</p>
            <DiagnosisHistory items={items} />
          </div>

          {purchaseItems.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-medium mb-3" style={{ color: '#FAA66B' }}>購入履歴</p>
              <PurchaseHistory items={purchaseItems} hasExistingRefund={hasExistingRefund} />
            </div>
          )}

          {user.user_metadata?.subscribed === true && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-medium mb-3" style={{ color: '#FAA66B' }}>サブスクリプション</p>
              {planLabel && (
                <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-3" style={{ backgroundColor: '#FFF2E8' }}>
                  <span className="text-sm font-medium" style={{ color: '#3F342D' }}>{planLabel}</span>
                  {intervalLabel && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FAA66B22', color: '#FAA66B' }}>
                      {intervalLabel}
                    </span>
                  )}
                </div>
              )}
              <ManagePlanButton />
            </div>
          )}

          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
