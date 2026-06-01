'use client'

import { useEffect, useState } from 'react'

const fmtDate = (s: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

type Sub = { id: string; user_id: string; email: string | null; plan: string | null; billing_cycle: string | null; status: string | null; created_at: string; current_period_end: string | null }

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[] | null>(null)

  useEffect(() => {
    fetch('/api/cocohare-hq/subscriptions').then(r => r.json()).then(d => setSubs(d.subscriptions ?? [])).catch(() => setSubs([]))
  }, [])

  if (!subs) return <Loading />

  const activeCount = subs.filter(s => s.status === 'active').length
  const canceledCount = subs.filter(s => s.status === 'canceled').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#3F342D' }}>サブスクリプション</h1>
        <span style={{ fontSize: '13px', color: '#2E7D32' }}>アクティブ: {activeCount}件</span>
        <span style={{ fontSize: '13px', color: '#999' }}>キャンセル: {canceledCount}件</span>
      </div>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F0EAE5' }}>
              {['メール', 'プラン', '請求サイクル', '開始日', '次回更新日', 'ステータス'].map(h => (
                <th key={h} style={{ textAlign: h === 'ステータス' ? 'center' : 'left', padding: '8px 12px', color: '#3F342D88', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #F9F5F2' }}>
                <td style={{ padding: '10px 12px', color: '#3F342D' }}>{s.email ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: '#3F342D' }}>{s.plan ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: '#3F342D99' }}>{s.billing_cycle === 'month' ? '月額' : s.billing_cycle === 'year' ? '年額' : (s.billing_cycle ?? '—')}</td>
                <td style={{ padding: '10px 12px', color: '#3F342D99', whiteSpace: 'nowrap' }}>{fmtDate(s.created_at)}</td>
                <td style={{ padding: '10px 12px', color: '#3F342D99', whiteSpace: 'nowrap' }}>{fmtDate(s.current_period_end)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  {s.status === 'active'
                    ? <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, backgroundColor: '#E8F5E9', color: '#2E7D32' }}>アクティブ</span>
                    : s.status === 'canceled'
                      ? <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FFEBEE', color: '#C62828' }}>キャンセル</span>
                      : <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, backgroundColor: '#F5F5F5', color: '#757575' }}>{s.status ?? '—'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Loading() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}><p style={{ color: '#3F342D88', fontSize: '14px' }}>読み込み中...</p></div>
}
