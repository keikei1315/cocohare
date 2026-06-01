'use client'

import { useEffect, useState } from 'react'

const fmt = (n: number) => `¥${n.toLocaleString()}`
const fmtDate = (s: string) => {
  const d = new Date(s)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const getType = (amount: number) => amount === 1480 ? '有料診断' : [2500, 3480, 3980, 4960, 8320].includes(amount) ? '高額診断' : 'その他'

type Payment = { id: string; amount: number; status: string; created_at: string; user_id: string; email: string | null }

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[] | null>(null)

  useEffect(() => {
    fetch('/api/cocohare-hq/payments').then(r => r.json()).then(d => setPayments(d.payments ?? [])).catch(() => setPayments([]))
  }, [])

  if (!payments) return <Loading />

  const completed = payments.filter(p => p.status === 'completed')
  const totalRevenue = completed.reduce((s, p) => s + p.amount, 0)
  const totalRefunded = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#3F342D' }}>決済一覧</h1>
        <span style={{ fontSize: '13px', color: '#2E7D32' }}>完了: {fmt(totalRevenue)}</span>
        <span style={{ fontSize: '13px', color: '#E65100' }}>返金: {fmt(totalRefunded)}</span>
      </div>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F0EAE5' }}>
              {['日時', 'メール', '種別', '金額', 'ステータス'].map(h => (
                <th key={h} style={{ textAlign: h === '金額' ? 'right' : h === 'ステータス' ? 'center' : 'left', padding: '8px 12px', color: '#3F342D88', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #F9F5F2' }}>
                <td style={{ padding: '10px 12px', color: '#3F342D99', whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</td>
                <td style={{ padding: '10px 12px', color: '#3F342D' }}>{p.email ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: '#3F342D99' }}>{getType(p.amount)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#3F342D', whiteSpace: 'nowrap' }}>{fmt(p.amount)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    completed: { label: '完了', bg: '#E8F5E9', color: '#2E7D32' },
    refunded: { label: '返金済', bg: '#FFF3E0', color: '#E65100' },
    pending: { label: '保留', bg: '#F5F5F5', color: '#757575' },
  }
  const s = map[status] ?? { label: status, bg: '#F5F5F5', color: '#757575' }
  return <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, backgroundColor: s.bg, color: s.color }}>{s.label}</span>
}

function Loading() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}><p style={{ color: '#3F342D88', fontSize: '14px' }}>読み込み中...</p></div>
}
