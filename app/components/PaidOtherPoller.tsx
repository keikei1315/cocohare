'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Props {
  diagnosisId: string
  reportType: 'paid_other_single' | 'paid_other_multi'
}

export default function PaidOtherPoller({ diagnosisId, reportType }: Props) {
  const router = useRouter()
  const polling = useRef(false)

  useEffect(() => {
    let cancelled = false

    const attempt = async () => {
      if (polling.current || cancelled) return
      polling.current = true
      try {
        const res = await fetch('/api/diagnosis/paid/generate-other', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagnosisId, reportType }),
        })
        const data = await res.json()
        if (data.ready) {
          router.refresh()
          return
        }
      } catch {
        // 次のインターバルで再試行
      } finally {
        polling.current = false
      }
    }

    attempt()
    const interval = setInterval(attempt, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [diagnosisId, reportType, router])

  const label = reportType === 'paid_other_single'
    ? '他者視点の深層分析を生成中です'
    : '複数視点の深層分析を生成中です'

  return (
    <div className="rounded-2xl p-5 shadow-sm text-center" style={{ backgroundColor: '#FFF8F2' }}>
      <Image src="/potori/humming.png" alt="ぽとり" width={50} height={50} className="object-contain mx-auto mb-3" />
      <p className="text-sm font-bold mb-1" style={{ color: '#FAA66B' }}>{label}</p>
      <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
        しばらくお待ちください。
      </p>
      <div className="flex gap-1.5 justify-center">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: '#FAA66B',
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
