'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function PaidSection2Poller({ diagnosisId }: { diagnosisId: string }) {
  const router = useRouter()
  const polling = useRef(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      if (polling.current) return
      polling.current = true
      try {
        const res = await fetch('/api/diagnosis/paid/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagnosisId, section: 'paid_2' }),
        })
        const data = await res.json()
        if (data.ready) {
          clearInterval(interval)
          router.refresh()
        }
      } catch {}
      finally { polling.current = false }
    }, 3000)
    return () => clearInterval(interval)
  }, [diagnosisId, router])

  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#FFF8F2' }}>
      <div className="flex gap-1.5 justify-center mb-3">
        {[0, 150, 300].map(d => (
          <span
            key={d}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }}
          />
        ))}
      </div>
      <p className="text-xs text-center font-medium" style={{ color: '#FAA66B' }}>
        残りのレポートを生成中...
      </p>
      <p className="text-xs text-center mt-1" style={{ color: '#3F342D66' }}>
        回復ヒント・向いてる仕事・成長ヒント・手紙をまとめています
      </p>
    </div>
  )
}
