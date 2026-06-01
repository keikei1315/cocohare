'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { OTHER_QUESTIONS } from '@/lib/diagnosis/other-questions'

type Phase = 'intro' | 'questions' | 'processing' | 'error'

const SECTION_LABELS: Record<number, string> = {
  1: 'SECTION 1',
  2: 'SECTION 2',
}

export default function OtherDiagnosisClient({
  token,
  requesterName,
}: {
  token: string
  requesterName: string
}) {
  const router = useRouter()
  const displayName = requesterName || 'あなたの友人'

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>(new Array(20).fill(null))
  const [selected, setSelected] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const advancing = useRef(false)

  const question = OTHER_QUESTIONS[currentQ]
  const progress = (currentQ / OTHER_QUESTIONS.length) * 100
  const isLastQ = currentQ === OTHER_QUESTIONS.length - 1

  const handleSelect = useCallback(async (trait: string) => {
    if (advancing.current || phase !== 'questions') return
    advancing.current = true

    setSelected(trait)
    const newAnswers = [...answers]
    newAnswers[currentQ] = trait

    if (isLastQ) {
      advancing.current = false
      setAnswers(newAnswers)
      setPhase('processing')

      try {
        const res = await fetch('/api/diagnosis/other/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, answers: newAnswers }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        router.push(`/diagnosis/other/${token}/done`)
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : '送信に失敗しました')
        setPhase('error')
      }
    } else {
      setAnswers(newAnswers)
      setCurrentQ(prev => prev + 1)
      setSelected(null)
      advancing.current = false
    }
  }, [answers, currentQ, isLastQ, phase, router, token])

  const handleBack = useCallback(() => {
    if (currentQ === 0) {
      setPhase('intro')
      return
    }
    setCurrentQ(prev => prev - 1)
    setSelected(answers[currentQ - 1])
  }, [currentQ, answers])

  // イントロ画面
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-16" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <Image src="/potori/good.png" alt="ぽとり" width={110} height={110} className="object-contain" />
          </div>

          <div className="inline-block px-3 py-1 rounded-full text-xs mb-4 font-medium" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
            診断のお願い
          </div>

          <h1 className="text-xl font-bold mb-3 leading-snug" style={{ color: '#3F342D' }}>
            <span style={{ color: '#FAA66B' }}>{displayName}</span>さんから<br />
            診断回答のお願いがきています
          </h1>

          <p className="text-sm leading-relaxed mb-8" style={{ color: '#3F342D99' }}>
            20問の質問に答えてください。<br />
            <span style={{ color: '#3F342D' }} className="font-medium">{displayName}</span>さんに当てはまると思うものを<br />
            直感で選んでいただけると助かります。
          </p>

          <button
            onClick={() => setPhase('questions')}
            className="w-full py-4 rounded-2xl text-white font-medium text-sm mb-4"
            style={{ backgroundColor: '#FAA66B' }}
          >
            {displayName}さんの診断をはじめる
          </button>

          <p className="text-xs" style={{ color: '#3F342D66' }}>約3〜5分で完了します</p>
        </div>
      </div>
    )
  }

  if (phase === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image src="/potori/humming.png" alt="ぽとり" width={110} height={110} className="object-contain" />
          </div>
          <h2 className="text-lg font-medium mb-2" style={{ color: '#3F342D' }}>
            回答を送信しています...
          </h2>
          <div className="mt-4 flex gap-1 justify-center">
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Image src="/potori/comforting.png" alt="ぽとり" width={100} height={100} className="object-contain" />
          </div>
          <h2 className="text-lg font-medium mb-2" style={{ color: '#3F342D' }}>エラーが発生しました</h2>
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

  // questions phase
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
            {currentQ + 1} / {OTHER_QUESTIONS.length}
          </span>
        </div>

        {/* 質問 */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-xs mb-3 text-center" style={{ color: '#FAA66B' }}>
            {displayName}さんに当てはまるものを選んでください
          </p>
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
