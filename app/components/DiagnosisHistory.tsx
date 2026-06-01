'use client'

import { useState } from 'react'
import Link from 'next/link'

type DiagItem = {
  id: string
  date: string
  badge: 'full' | 'detail' | 'free' | 'ht_standalone'
  href: string
}

const BADGE = {
  full:          { label: '完全版', bg: '#FAA66B', color: '#fff' },
  detail:        { label: '詳細付き', bg: '#FFF2E8', color: '#FAA66B' },
  free:          { label: '無料', bg: '#F0EAE5', color: '#3F342D99' },
  ht_standalone: { label: '完全版', bg: '#FAA66B', color: '#fff' },
}

export default function DiagnosisHistory({ items }: { items: DiagItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, 5)
  const hasMore = items.length > 5

  if (items.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs mb-4" style={{ color: '#3F342D66' }}>まだ受診していません</p>
        <Link
          href="/diagnosis/free"
          className="text-xs font-medium px-4 py-2 rounded-xl"
          style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}
        >
          無料で診断する
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        {visible.map(item => {
          const badge = BADGE[item.badge]
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ backgroundColor: '#FAFAFA' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ backgroundColor: badge.bg, color: badge.color }}
                >
                  {badge.label}
                </span>
                <span className="text-xs" style={{ color: '#3F342D' }}>
                  {new Date(item.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <span className="text-xs" style={{ color: '#FAA66B' }}>見る →</span>
            </Link>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full mt-3 py-2 rounded-xl text-xs font-medium transition"
          style={{ backgroundColor: '#F5F0EC', color: '#3F342D99' }}
        >
          {expanded ? '閉じる ▲' : `全て見る（${items.length}件） ▼`}
        </button>
      )}
    </div>
  )
}
