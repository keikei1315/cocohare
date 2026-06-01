'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/cocohare-hq', label: 'ダッシュボード', emoji: '📊' },
  { href: '/cocohare-hq/users', label: 'ユーザー', emoji: '👥' },
  { href: '/cocohare-hq/payments', label: '決済', emoji: '💳' },
  { href: '/cocohare-hq/subscriptions', label: 'サブスク', emoji: '🔄' },
  { href: '/cocohare-hq/refunds', label: '返金申請', emoji: '↩️' },
]

export default function AdminNav() {
  const path = usePathname()
  return (
    <nav style={{ padding: '8px 0' }}>
      {NAV.map(({ href, label, emoji }) => {
        const active = href === '/cocohare-hq' ? path === '/cocohare-hq' : path.startsWith(href)
        return (
          <Link key={href} href={href} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 16px', fontSize: '13px', textDecoration: 'none',
            color: active ? '#FAA66B' : 'rgba(255,255,255,0.65)',
            backgroundColor: active ? 'rgba(250,166,107,0.12)' : 'transparent',
            borderLeft: `3px solid ${active ? '#FAA66B' : 'transparent'}`,
          }}>
            <span>{emoji}</span>{label}
          </Link>
        )
      })}
    </nav>
  )
}
