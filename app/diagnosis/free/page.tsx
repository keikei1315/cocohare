'use client'

import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { FREE_QUESTIONS } from '@/lib/diagnosis/free-questions'

type Phase = 'loading' | 'paywall' | 'questions' | 'processing' | 'error'

function FreeDiagnosisInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('loading')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>(new Array(20).fill(null))
  const [selected, setSelected] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [paywallLoading, setPaywallLoading] = useState(false)
  const advancing = useRef(false)

  const question = FREE_QUESTIONS[currentQ]
  const progress = (currentQ / FREE_QUESTIONS.length) * 100
  const isLastQ = currentQ === FREE_QUESTIONS.length - 1
  const lastDiagnosisId = typeof window !== 'undefined' ? localStorage.getItem('cocohare_last_diagnosis_id') : null

  useEffect(() => {
    // サーバー側で決済検証・認証済み → そのまま診断開始
    if (searchParams.get('retry_ok') === '1') {
      localStorage.removeItem('free_done')
      setPhase('questions')
      return
    }

    const freeDone = localStorage.getItem('free_done')
    if (freeDone === 'true') {
      setPhase('paywall')
    } else {
      setPhase('questions')
    }
  }, [searchParams])

  const handlePaywall = async () => {
    setPaywallLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout-free-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.url) router.push(data.url)
    } catch {
      setPaywallLoading(false)
    }
  }

  const handleSelect = useCallback(async (trait: string) => {
    if (advancing.current || phase !== 'questions') return
    advancing.current = true

    setSelected(trait)
    const newAnswers = [...answers]
    newAnswers[currentQ] = trait

    if (isLastQ) {
      setAnswers(newAnswers)
      advancing.current = false
      setPhase('processing')

      let guestSessionId = localStorage.getItem('cocohare_guest_session')
      if (!guestSessionId) {
        guestSessionId = crypto.randomUUID()
        localStorage.setItem('cocohare_guest_session', guestSessionId)
      }

      try {
        const res = await fetch('/api/diagnosis/free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: newAnswers, guestSessionId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        localStorage.setItem('cocohare_last_diagnosis_id', data.diagnosisId)
        localStorage.setItem('free_done', 'true')
        document.cookie = `cocohare_last_diagnosis_id=${data.diagnosisId}; max-age=${365 * 24 * 60 * 60}; path=/; SameSite=Lax`
        router.push(`/diagnosis/free/result/${data.diagnosisId}`)
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : '診断処理に失敗しました')
        setPhase('error')
      }
    } else {
      setAnswers(newAnswers)
      setCurrentQ(prev => prev + 1)
      setSelected(null)
      advancing.current = false
    }
  }, [answers, currentQ, isLastQ, phase, router])

  const handleBack = useCallback(() => {
    if (currentQ === 0) {
      router.push('/')
    } else {
      setCurrentQ(prev => prev - 1)
      setSelected(answers[currentQ - 1])
    }
  }, [currentQ, answers, router])

  // ローディング
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  // ペイウォール（2回目以降）
  if (phase === 'paywall') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-16" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <Image src="/potori/humming.png" alt="ぽとり" width={90} height={90} className="object-contain" />
          </div>
          <h1 className="text-lg font-bold mb-2 leading-snug" style={{ color: '#3F342D' }}>
            もう一度診断を受けますか？
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#3F342D99' }}>
            2回目以降の診断は¥290でご利用いただけます。
          </p>

          {lastDiagnosisId && (
            <Link
              href={`/diagnosis/free/result/${lastDiagnosisId}`}
              className="block w-full py-4 rounded-2xl text-sm font-medium mb-3"
              style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}
            >
              前回の診断結果を見る
            </Link>
          )}

          <button
            onClick={handlePaywall}
            disabled={paywallLoading}
            className="w-full py-4 rounded-2xl text-white font-medium text-sm mb-4"
            style={{ backgroundColor: paywallLoading ? '#F0C89F' : '#FAA66B' }}
          >
            {paywallLoading ? '処理中...' : '¥290でもう一度診断を受ける'}
          </button>

          <p className="text-xs" style={{ color: '#3F342D66' }}>
            Stripeの安全な決済を使用しています
          </p>
        </div>
      </div>
    )
  }

  // 処理中
  if (phase === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image src="/potori/peek.png" alt="ぽとり" width={120} height={120} className="object-contain animate-bounce" />
          </div>
          <h2 className="text-lg font-medium mb-3" style={{ color: '#3F342D' }}>
            ぽとりが分析しています...
          </h2>
          <p className="text-sm" style={{ color: '#3F342D99' }}>
            あなたの回答から、丁寧にレポートを作っています
          </p>
          <div className="mt-6 flex gap-1 justify-center">
            {[0, 150, 300].map(d => (
              <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // エラー
  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Image src="/potori/comforting.png" alt="ぽとり" width={100} height={100} className="object-contain" />
          </div>
          <h2 className="text-lg font-medium mb-2" style={{ color: '#3F342D' }}>
            エラーが発生しました
          </h2>
          <p className="text-sm mb-6" style={{ color: '#3F342D99' }}>{errorMsg}</p>
          <button
            onClick={() => {
              setPhase('questions')
              setCurrentQ(0)
              setAnswers(new Array(20).fill(null))
              setSelected(null)
            }}
            className="w-full py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: '#FAA66B' }}
          >
            もう一度試す
          </button>
        </div>
      </div>
    )
  }

  // 設問
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="w-full h-1" style={{ backgroundColor: '#F0EAE5' }}>
        <div
          className="h-1 transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: '#FAA66B' }}
        />
      </div>

      <div className="flex-1 flex flex-col px-4 pt-8 max-w-sm mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
            {question.section === 1 ? 'SECTION 1' : 'SECTION 2'}
          </span>
          <span className="text-xs" style={{ color: '#3F342D66' }}>
            {currentQ + 1} / {FREE_QUESTIONS.length}
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <p className="text-base font-medium leading-relaxed mb-8 text-center" style={{ color: '#3F342D' }}>
            {question.text}
          </p>

          <div className="space-y-3">
            {question.options.map((option) => (
              <button
                key={option.trait}
                onClick={() => handleSelect(option.trait)}
                className="w-full text-left px-5 py-4 rounded-2xl transition-all duration-150 active:scale-95"
                style={{
                  border: `1.5px solid ${selected === option.trait ? '#FAA66B' : '#F0EAE5'}`,
                  backgroundColor: selected === option.trait ? '#FFF2E8' : '#FFFFFF',
                  color: '#3F342D',
                }}
              >
                <span className="text-sm leading-relaxed">{option.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="py-8">
          <button
            onClick={handleBack}
            className="w-full py-3 rounded-xl border text-sm transition"
            style={{ borderColor: '#E5DDD8', color: '#3F342D99' }}
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FreeDiagnosisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    }>
      <FreeDiagnosisInner />
    </Suspense>
  )
}
