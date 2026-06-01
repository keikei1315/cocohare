'use client'

import { useEffect, useState } from 'react'

const fmtDate = (s: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

type Profile = { id: string; email: string | null; subscription_plan: string | null; subscription_status: string | null; created_at: string }

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)

  useEffect(() => {
    fetch('/api/cocohare-hq/users').then(r => r.json()).then(d => setProfiles(d.profiles ?? [])).catch(() => setProfiles([]))
  }, [])

  if (!profiles) return <Loading />

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: '20px', color: '#3F342D' }}>
        ユーザー <span style={{ fontSize: '14px', fontWeight: 400, color: '#3F342D88' }}>({profiles.length}件)</span>
      </h1>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F0EAE5' }}>
              {['メール', '登録日', 'サブスク'].map(h => (
                <th key={h} style={{ textAlign: h === 'サブスク' ? 'center' : 'left', padding: '8px 12px', color: '#3F342D88', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #F9F5F2' }}>
                <td style={{ padding: '10px 12px', color: '#3F342D' }}>{p.email ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: '#3F342D99', whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  {p.subscription_status === 'active'
                    ? <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, backgroundColor: '#E8F5E9', color: '#2E7D32' }}>{p.subscription_plan ?? 'サブスク'}</span>
                    : <span style={{ color: '#3F342D44', fontSize: '12px' }}>—</span>}
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
