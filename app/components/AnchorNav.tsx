'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  hasPaid: boolean
  hasOther: boolean
  hasOtherMulti?: boolean
  hasHighTicket?: boolean
}

const BASE_ITEMS = [
  { id: 'overview',   label: 'あなたのこと' },
  { id: 'traits',     label: '特性' },
  { id: 'strengths',  label: '強み' },
  { id: 'painful',    label: 'しんどさ' },
  { id: 'message',    label: 'メッセージ' },
  { id: 'share',      label: 'シェア' },
]

export default function AnchorNav({ hasPaid, hasOther, hasOtherMulti, hasHighTicket }: Props) {
  const [active, setActive] = useState('overview')
  const scrollRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const items = [
    ...BASE_ITEMS,
    ...(hasOther      ? [{ id: 'other',       label: '他者視点' }]    : []),
    ...(hasOtherMulti ? [{ id: 'other-multi', label: 'みんなの視点' }] : []),
    ...(hasPaid          ? [{ id: 'paid',        label: '詳細レポート' }]   : []),
    ...(hasHighTicket    ? [{ id: 'ht',          label: '完全版レポート' }]  : []),
  ]

  useEffect(() => {
    const container = scrollRef.current
    const btn = buttonRefs.current.get(active)
    if (!container || !btn) return
    container.scrollTo({ left: btn.offsetLeft - 16, behavior: 'smooth' })
  }, [active])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-40% 0px -55% 0px' }
    )
    items.forEach(item => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [items])

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 100
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  return (
    <div ref={scrollRef} className="sticky top-12 z-10 py-2 mb-2 overflow-x-auto" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="flex gap-2 px-4 w-max min-w-full justify-center">
        {items.map(item => (
          <button
            key={item.id}
            ref={el => { if (el) buttonRefs.current.set(item.id, el) }}
            onClick={() => handleClick(item.id)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: active === item.id ? '#FAA66B' : '#F0EAE5',
              color: active === item.id ? '#fff' : '#3F342D99',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
