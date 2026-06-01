'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import GlobalNavDrawer from '@/app/components/GlobalNavDrawer'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const id = localStorage.getItem('cocohare_last_diagnosis_id')
      || document.cookie.match(/cocohare_last_diagnosis_id=([^;]+)/)?.[1]
      || null
    setDiagnosisId(id)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12"
        style={{ backgroundColor: '#FFF9F5', borderBottom: '1px solid #F0EAE5' }}
      >
        <Link href="/" className="flex items-center gap-2">
          <Image src="/potori/humming.png" alt="ここはれ" width={28} height={28} className="object-contain" />
          <span className="text-sm font-bold" style={{ color: '#3F342D' }}>CocoHare</span>
        </Link>

        <div className="flex items-center gap-2">
          {diagnosisId && (
            <Link
              href={`/diagnosis/free/result/${diagnosisId}`}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#FAA66B', color: '#fff' }}
            >
              診断結果を見る
            </Link>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            aria-label="メニュー"
          >
            <span
              className="block w-5 h-0.5 transition-all duration-200"
              style={{
                backgroundColor: '#3F342D',
                transform: open ? 'translateY(8px) rotate(45deg)' : 'none',
              }}
            />
            <span
              className="block w-5 h-0.5 transition-all duration-200"
              style={{
                backgroundColor: '#3F342D',
                opacity: open ? 0 : 1,
              }}
            />
            <span
              className="block w-5 h-0.5 transition-all duration-200"
              style={{
                backgroundColor: '#3F342D',
                transform: open ? 'translateY(-8px) rotate(-45deg)' : 'none',
              }}
            />
          </button>
        </div>
      </header>

      <GlobalNavDrawer isOpen={open} onClose={() => setOpen(false)} />

      {/* ヘッダー分のスペーサー */}
      <div className="h-12" />
    </>
  )
}
