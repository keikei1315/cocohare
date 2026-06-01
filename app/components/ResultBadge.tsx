'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function getStoredDiagnosisId(): string | null {
  // localStorage優先、なければcookieから取得（iOS Safari対策）
  const fromStorage = localStorage.getItem('cocohare_last_diagnosis_id')
  if (fromStorage) return fromStorage
  const match = document.cookie.split('; ').find(r => r.startsWith('cocohare_last_diagnosis_id='))
  return match ? match.split('=')[1] : null
}

export default function ResultBadge() {
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    setDiagnosisId(getStoredDiagnosisId())
  }, [])

  if (!diagnosisId) return null
  if (pathname.startsWith('/diagnosis/free/result')) return null

  return (
    <Link
      href={`/diagnosis/free/result/${diagnosisId}`}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium shadow-md transition hover:opacity-90"
      style={{ backgroundColor: '#FAA66B', color: '#fff' }}
    >
      診断結果を見る
    </Link>
  )
}
