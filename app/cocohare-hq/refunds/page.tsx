'use client'

import { useEffect, useState } from 'react'

const fmt = (n: number) => `¥${n.toLocaleString()}`
const fmtDate = (s: string) => {
  const d = new Date(s)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const ANSWER_LABELS: Record<string, string> = {
  reason: '解約理由', overall_satisfaction: '総合満足度', accuracy_rating: '精度評価',
  will_continue: '継続意向', would_recommend: '推奨', pre_purchase_expectation: '購入前の期待',
  expectation_gap: '期待とのギャップ', least_useful_part: '不満な点', top_priority_improvement: '改善優先度',
  improvement_suggestions: '改善提案', competitor_comparison: '競合比較', other_feedback: 'その他コメント',
}
const RATING_KEYS = new Set(['overall_satisfaction', 'accuracy_rating'])

type Refund = { id: string; user_id: string; email: string | null; amount: number; stripe_refund_id: string | null; answers: Record<string, unknown> | null; created_at: string }

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[] | null>(null)

  useEffect(() => {
    fetch('/api/cocohare-hq/refunds').then(r => r.json()).then(d => setRefunds(d.refunds ?? [])).catch(() => setRefunds([]))
  }, [])

  if (!refunds) return <Loading />

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: '20px', color: '#3F342D' }}>
        返金申請 <span style={{ fontSize: '14px', fontWeight: 400, color: '#3F342D88' }}>({refunds.length}件)</span>
      </h1>

      {!refunds.length && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#3F342D88', backgroundColor: '#fff', borderRadius: '16px' }}>返金申請はありません</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {refunds.map(r => (
          <div key={r.id} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#3F342D' }}>{r.email ?? '—'}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#3F342D88' }}>{fmtDate(r.created_at)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#E65100' }}>{fmt(r.amount)}</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#3F342D66' }}>返金ID: {r.stripe_refund_id ?? '未処理'}</p>
              </div>
            </div>
            {r.answers && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {Object.entries(ANSWER_LABELS).map(([key, label]) => {
                  const val = r.answers![key]
                  if (val === undefined || val === null || val === '') return null
                  return (
                    <div key={key} style={{ backgroundColor: '#FFF9F5', borderRadius: '10px', padding: '10px 12px' }}>
                      <p style={{ margin: '0 0 3px', fontSize: '10px', color: '#3F342D88' }}>{label}</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#3F342D', fontWeight: RATING_KEYS.has(key) ? 600 : 400 }}>
                        {RATING_KEYS.has(key) ? `${'★'.repeat(Number(val))}${'☆'.repeat(5 - Number(val))} (${val}/5)` : String(val)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Loading() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}><p style={{ color: '#3F342D88', fontSize: '14px' }}>読み込み中...</p></div>
}
