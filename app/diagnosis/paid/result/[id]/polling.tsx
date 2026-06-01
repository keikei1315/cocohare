'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function PaidResultPolling({ diagnosisId }: { diagnosisId: string }) {
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
          body: JSON.stringify({ diagnosisId, section: 'paid_1' }),
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
      <Image src="/potori/humming.png" alt="ぽとり" width={90} height={90} className="object-contain mb-6" />
      <h1 className="text-lg font-bold mb-3 text-center" style={{ color: '#3F342D' }}>
        詳細レポートを生成中です
      </h1>
      <p className="text-sm text-center leading-relaxed mb-6" style={{ color: '#3F342D99' }}>
        あなたの特性に合わせたレポートを<br />丁寧に作っています。<br />このページはそのままお待ちください。
      </p>
      <div className="flex gap-1.5">
        {[0, 150, 300].map(d => (
          <span
            key={d}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }}
          />
        ))}
      </div>
      <p className="text-xs mt-6" style={{ color: '#3F342D44' }}>通常30秒〜1分ほどかかります</p>
    </div>
  )
}
