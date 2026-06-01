'use client'

import { useEffect, useState } from 'react'

const fmt = (n: number) => `¥${n.toLocaleString()}`
const fmtDate = (s: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
const rate = (num: number, base: number) =>
  base === 0 ? '—' : `${Math.round((num / base) * 100)}%`

type Stats = {
  userCount: number
  totalRevenue: number
  activeSubCount: number
  refundCount: number
  freeDiagCount: number
  otherPerspCount: number
  paidDiagCount: number
  highTicketCount: number
  recentPayments: { amount: number; status: string; created_at: string; user_id: string; email: string | null }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/cocohare-hq/stats')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setStats)
      .catch(() => setError(true))
  }, [])

  if (error) return <div style={{ padding: '48px', textAlign: 'center', color: '#3F342D88' }}>データの取得に失敗しました</div>
  if (!stats) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}><p style={{ color: '#3F342D88', fontSize: '14px' }}>読み込み中...</p></div>

  const { userCount, totalRevenue, activeSubCount, refundCount, freeDiagCount, otherPerspCount, paidDiagCount, highTicketCount, recentPayments } = stats

  const kpis = [
    { label: '総会員数', value: `${userCount}人`, color: '#FAA66B' },
    { label: '総売上', value: fmt(totalRevenue), color: '#4CAF50' },
    { label: 'アクティブサブスク', value: `${activeSubCount}件`, color: '#2196F3' },
    { label: '返金申請', value: `${refundCount}件`, color: '#FF5722' },
  ]

  const conversions = [
    { label: '無料診断者数', value: `${freeDiagCount}人`, sub: null, color: '#3F342D', bg: '#FFF9F5' },
    { label: '他者診断実行率', value: rate(otherPerspCount, freeDiagCount), sub: `${otherPerspCount}人`, color: '#9C27B0', bg: '#F3E5F5' },
    { label: '有料診断購入率', value: rate(paidDiagCount, freeDiagCount), sub: `${paidDiagCount}人`, color: '#FAA66B', bg: '#FFF3E0' },
    { label: '高額診断購入率', value: rate(highTicketCount, freeDiagCount), sub: `${highTicketCount}人`, color: '#F44336', bg: '#FFEBEE' },
    { label: 'サブスク契約率', value: rate(activeSubCount, freeDiagCount), sub: `${activeSubCount}人`, color: '#2196F3', bg: '#E3F2FD' },
  ]

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: '20px', color: '#3F342D' }}>ダッシュボード</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {kpis.map(({ label, value, color }) => (
          <div key={label} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#3F342D88' }}>{label}</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '15px', color: '#3F342D' }}>コンバージョン（無料診断者基準）</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {conversions.map(({ label, value, sub, color, bg }) => (
            <div key={label} style={{ backgroundColor: bg, borderRadius: '12px', padding: '16px 12px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#3F342D88', lineHeight: 1.4 }}>{label}</p>
              <p style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color }}>{value}</p>
              {sub && <p style={{ margin: 0, fontSize: '11px', color: '#3F342D88' }}>{sub}</p>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '15px', color: '#3F342D' }}>直近の決済</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F0EAE5' }}>
              {['日時', 'メール', '金額', 'ステータス'].map(h => (
                <th key={h} style={{ textAlign: h === '金額' ? 'right' : h === 'ステータス' ? 'center' : 'left', padding: '8px 12px', color: '#3F342D88', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentPayments.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F9F5F2' }}>
                <td style={{ padding: '10px 12px', color: '#3F342D99', whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</td>
                <td style={{ padding: '10px 12px', color: '#3F342D' }}>{p.email ?? '—'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#3F342D' }}>{fmt(p.amount)}</td>
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
