'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'ホーム',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={active ? '#FAA66B' : '#3F342D66'} strokeWidth="1.5" fill={active ? '#FFF2E8' : 'none'} />
        <path d="M7 18v-5h6v5" stroke={active ? '#FAA66B' : '#3F342D66'} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/counseling/chat',
    label: 'はなす',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H7l-4 3V5a1 1 0 011-1z" stroke={active ? '#FAA66B' : '#3F342D66'} strokeWidth="1.5" fill={active ? '#FFF2E8' : 'none'} />
      </svg>
    ),
  },
  {
    href: '/counseling/record',
    label: 'きろく',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="3" width="12" height="14" rx="2" stroke={active ? '#FAA66B' : '#3F342D66'} strokeWidth="1.5" fill={active ? '#FFF2E8' : 'none'} />
        <path d="M7 7h6M7 10h6M7 13h4" stroke={active ? '#FAA66B' : '#3F342D66'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/counseling/report',
    label: 'レポート',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 14l4-4 3 3 5-6" stroke={active ? '#FAA66B' : '#3F342D66'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="3" width="14" height="14" rx="2" stroke={active ? '#FAA66B' : '#3F342D66'} strokeWidth="1.5" fill={active ? '#FFF2E8' : 'none'} />
      </svg>
    ),
  },
]

export default function CounselingNav() {
  const pathname = usePathname()

  // These routes manage their own navigation
  if (
    pathname.startsWith('/counseling/chat') ||
    pathname.startsWith('/counseling/diary') ||
    pathname.startsWith('/counseling/mood-check')
  ) {
    return null
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex"
      style={{ backgroundColor: '#FFF9F5', borderTop: '1px solid #F0EAE5', height: '64px' }}
    >
      {NAV_ITEMS.map(item => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center gap-1"
          >
            {item.icon(active)}
            <span className="text-xs" style={{ color: active ? '#FAA66B' : '#3F342D66' }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
