'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function LastResultLink() {
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null)

  useEffect(() => {
    setDiagnosisId(localStorage.getItem('cocohare_last_diagnosis_id'))
  }, [])

  if (!diagnosisId) return null

  return (
    <Link
      href={`/diagnosis/free/result/${diagnosisId}`}
      className="block w-full py-2.5 rounded-xl text-center text-xs transition"
      style={{ borderColor: '#E5DDD8', color: '#3F342D99', border: '1px solid #E5DDD8' }}
    >
      前回の診断結果を見る →
    </Link>
  )
}
