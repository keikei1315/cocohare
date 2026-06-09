'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PAID_QUESTIONS, PAID_OPTIONS } from '@/lib/diagnosis/paid-questions'

const SECTION_LABELS: Record<number, string> = {
  3: '消耗パターン',
  4: '回復パターン',
  5: '人間関係スタイル',
  6: '自己基準',
  7: '感情の処理スタイル',
}

export default function PaidQuestionsClient({ diagnosisId }: { diagnosisId: string }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(PAID_QUESTIONS.length).fill(null))
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const advancing = useRef(false)

  const question = PAID_QUESTIONS[current]
  const progress = (current / PAID_QUESTIONS.length) * 100
  const isLast = current === PAID_QUESTIONS.length - 1

  const handleSelect = async (value: number) => {
    if (advancing.current || submitting) return
    advancing.current = true

    setSelected(value)
    const newAnswers = [...answers]
    newAnswers[current] = value
    setAnswers(newAnswers)

    if (!isLast) {
      setTimeout(() => {
        setCurrent(prev => prev + 1)
        setSelected(newAnswers[current + 1])
        advancing.current = false
      }, 200)
    } else {
      advancing.current = false
      setSubmitting(true)
      setError('')
      try {
        const filledAnswers = newAnswers.map(a => a ?? 1)
        const res = await fetch('/api/diagnosis/paid/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagnosisId, answers: filledAnswers }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        router.push(`/diagnosis/free/result/${diagnosisId}`)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '送信に失敗しました')
        setSubmitting(false)
      }
    }
  }

  const handleBack = () => {
    if (current > 0) {
      setCurrent(prev => prev - 1)
      setSelected(answers[current - 1])
    }
  }

  if (submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image src="/potori/peek.webp" alt="ぽとり" width={120} height={120} className="object-contain animate-bounce" />
          </div>
          <h2 className="text-lg font-medium mb-3" style={{ color: '#3F342D' }}>
            ぽとりが分析しています...
          </h2>
          <p className="text-sm" style={{ color: '#3F342D99' }}>
            あなたの40問の回答をもとに、丁寧にレポートを作っています
          </p>
          <div className="mt-6 flex gap-1 justify-center">
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF9F5' }}>
      {/* プログレスバー */}
      <div className="w-full h-1" style={{ backgroundColor: '#F0EAE5' }}>
        <div
          className="h-1 transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: '#FAA66B' }}
        />
      </div>

      <div className="flex-1 flex flex-col px-4 pt-8 max-w-sm mx-auto w-full">
        {/* セクション表示 */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
            {SECTION_LABELS[question.section]}
          </span>
          <span className="text-xs" style={{ color: '#3F342D66' }}>
            {current + 1} / {PAID_QUESTIONS.length}
          </span>
        </div>

        {/* 質問 */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-base font-medium leading-relaxed mb-8 text-center" style={{ color: '#3F342D' }}>
            {question.text}
          </p>

          {error && <p className="text-xs text-center mb-4" style={{ color: '#E57373' }}>{error}</p>}

          <div className="space-y-3">
            {PAID_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="w-full text-left px-5 py-4 rounded-2xl transition-all duration-150 active:scale-95"
                style={{
                  border: `1.5px solid ${selected === opt.value ? '#FAA66B' : '#F0EAE5'}`,
                  backgroundColor: selected === opt.value ? '#FFF2E8' : '#FFFFFF',
                  color: '#3F342D',
                }}
              >
                <span className="text-sm leading-relaxed">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Back button */}
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
