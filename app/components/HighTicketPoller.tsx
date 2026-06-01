'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function HighTicketPoller({ diagnosisId }: { diagnosisId: string }) {
  const router = useRouter()
  const polling = useRef(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      if (polling.current) return
      polling.current = true
      try {
        const res = await fetch('/api/diagnosis/high-ticket/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagnosisId }),
        })
        const data = await res.json()
        if (data.ready) {
          clearInterval(interval)
          router.refresh()
        }
      } catch {}
      finally { polling.current = false }
    }, 5000)
    return () => clearInterval(interval)
  }, [diagnosisId, router])

  return (
    <div className="px-4 max-w-xl mx-auto mb-4">
      <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#FFF2E8' }}>
        <div className="flex gap-1 justify-center mb-2">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }} />
          ))}
        </div>
        <p className="text-xs font-medium" style={{ color: '#FAA66B' }}>レポートを生成中です...</p>
        <p className="text-xs mt-1" style={{ color: '#3F342D66' }}>5種類のレポート生成に1〜2分かかります。このページを開いたままお待ちください。</p>
      </div>
    </div>
  )
}
