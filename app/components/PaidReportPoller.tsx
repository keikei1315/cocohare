'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function PaidReportPoller() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 3000)
    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
      <Image src="/potori/humming.png" alt="ぽとり" width={60} height={60} className="object-contain mx-auto mb-3" />
      <p className="text-sm font-bold mb-1" style={{ color: '#3F342D' }}>詳細レポートを生成中です</p>
      <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
        40問の回答をもとに分析しています。<br />しばらくお待ちください。
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
