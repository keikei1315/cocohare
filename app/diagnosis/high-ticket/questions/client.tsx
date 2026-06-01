'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { STRENGTH_DOMAINS, DEEP_PSYCH_QUESTIONS, SPIRITUAL_QUESTIONS } from '@/lib/diagnosis/high-ticket-questions'
type Phase = 'intro' | 'strength' | 'deep' | 'spiritual' | 'info' | 'processing' | 'error'

const PHASE_LABELS: Record<string, string> = {
  strength: '才能診断',
  deep: '深層心理',
  spiritual: 'あなたの今',
  info: '基本情報',
}

const STRENGTH_OPTIONS = [
  { value: 4, text: 'とてもあてはまる' },
  { value: 3, text: 'ややあてはまる' },
  { value: 2, text: 'あまりあてはまらない' },
  { value: 1, text: 'あてはまらない' },
]

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1" style={{ backgroundColor: '#F0EAE5' }}>
      <div className="h-1 transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: '#FAA66B' }} />
    </div>
  )
}

export default function HighTicketQuestionsClient({
  stripeSessionId,
  freeDiagnosisId,
}: {
  stripeSessionId: string
  freeDiagnosisId: string | null
}) {
  const router = useRouter()
  const advancing = useRef(false)

  const [phase, setPhase] = useState<Phase>('intro')
  const [errorMsg, setErrorMsg] = useState('')

  // 強み診断 (60問)
  const totalStrength = 60
  const [strengthAnswers, setStrengthAnswers] = useState<(number | null)[]>(new Array(totalStrength).fill(null))
  const [strengthIdx, setStrengthIdx] = useState(0)

  // 深層心理 (12問)
  const [deepAnswers, setDeepAnswers] = useState<(string | null)[]>(new Array(12).fill(null))
  const [deepIdx, setDeepIdx] = useState(0)

  // スピリチュアル (6問)
  const [spiritualAnswers, setSpiritualAnswers] = useState<(string | null)[]>(new Array(6).fill(null))
  const [spiritualIdx, setSpiritualIdx] = useState(0)
  const [textInput, setTextInput] = useState('')

  // 基本情報
  const [birthday, setBirthday] = useState('')
  const [worries, setWorries] = useState('')
  const [goals, setGoals] = useState('')

  // --- 強み診断ロジック ---
  const currentStrengthQ = (() => {
    let idx = 0
    for (const domain of STRENGTH_DOMAINS) {
      for (const talent of domain.talents) {
        for (let q = 0; q < 3; q++) {
          if (idx === strengthIdx) return { domain: domain.domain, talent: talent.name, text: talent.questions[q] }
          idx++
        }
      }
    }
    return null
  })()

  const handleStrengthSelect = useCallback((value: number) => {
    if (advancing.current) return
    advancing.current = true
    const next = [...strengthAnswers]
    next[strengthIdx] = value
    setStrengthAnswers(next)
    if (strengthIdx < totalStrength - 1) {
      setStrengthIdx(i => i + 1)
      advancing.current = false
    } else {
      setPhase('deep')
      advancing.current = false
    }
  }, [strengthAnswers, strengthIdx])

  // --- 深層心理ロジック ---
  const handleDeepSelect = useCallback((value: string) => {
    if (advancing.current) return
    advancing.current = true
    const next = [...deepAnswers]
    next[deepIdx] = value
    setDeepAnswers(next)
    if (deepIdx < 11) {
      setDeepIdx(i => i + 1)
      advancing.current = false
    } else {
      setPhase('spiritual')
      advancing.current = false
    }
  }, [deepAnswers, deepIdx])

  // --- スピリチュアルロジック ---
  const currentSpiritual = SPIRITUAL_QUESTIONS[spiritualIdx]

  const handleSpiritualNext = useCallback(() => {
    const next = [...spiritualAnswers]
    next[spiritualIdx] = textInput
    setSpiritualAnswers(next)
    setTextInput('')
    if (spiritualIdx < 5) {
      setSpiritualIdx(i => i + 1)
    } else {
      setPhase('info')
    }
  }, [spiritualAnswers, spiritualIdx, textInput])

  const handleSpiritualChoice = useCallback((value: string) => {
    if (advancing.current) return
    advancing.current = true
    const next = [...spiritualAnswers]
    next[spiritualIdx] = value
    setSpiritualAnswers(next)
    if (spiritualIdx < 5) {
      setSpiritualIdx(i => i + 1)
      advancing.current = false
    } else {
      setPhase('info')
      advancing.current = false
    }
  }, [spiritualAnswers, spiritualIdx])

  // スピリチュアルのテキスト入力時に前の回答を復元
  const onSpiritualPhaseEnter = useCallback(() => {
    if (currentSpiritual?.type === 'text' && spiritualAnswers[spiritualIdx]) {
      setTextInput(spiritualAnswers[spiritualIdx] as string)
    }
  }, [currentSpiritual, spiritualAnswers, spiritualIdx])

  // --- 送信 ---
  const handleSubmit = async () => {
    if (!birthday || !worries.trim() || !goals.trim()) return
    setPhase('processing')

    const spiritualObj: Record<string, string> = {}
    SPIRITUAL_QUESTIONS.forEach((q, i) => { spiritualObj[`q${i + 1}`] = spiritualAnswers[i] ?? '' })

    try {
      const res = await fetch('/api/diagnosis/high-ticket/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeSessionId,
          freeDiagnosisId,
          strengthAnswers,
          deepPsychAnswers: deepAnswers,
          spiritualAnswers: spiritualObj,
          birthday,
          worries,
          goals,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.setItem('ht_diagnosis_id', data.diagnosisId)
      if (freeDiagnosisId) {
        localStorage.setItem(`paid_unlocked_${freeDiagnosisId}`, 'true')
        localStorage.setItem('ht_free_diagnosis_id', freeDiagnosisId)
        router.push(`/diagnosis/free/result/${freeDiagnosisId}`)
      } else {
        router.push(`/diagnosis/high-ticket/${data.diagnosisId}/result`)
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '送信に失敗しました')
      setPhase('error')
    }
  }

  // ===== イントロ =====
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-16" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <Image src="/potori/happy.png" alt="ぽとり" width={100} height={100} className="object-contain" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full text-xs mb-4 font-medium" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
            完全版自己分析
          </div>
          <h1 className="text-xl font-bold mb-3 leading-snug" style={{ color: '#3F342D' }}>
            ありがとうございます。<br />それでは始めましょう。
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#3F342D99' }}>
            3つのフェーズに分かれています。<br />
            直感で答えてください。
          </p>
          <div className="space-y-2 mb-8 text-left">
            {[
              { phase: '1', label: '才能診断', desc: '60問・4段階評価', color: '#FAA66B' },
              { phase: '2', label: '深層心理', desc: '12問・直感4択', color: '#9B8DD4' },
              { phase: '3', label: 'あなたの今', desc: '6問＋基本情報入力', color: '#6BB5A0' },
            ].map(p => (
              <div key={p.phase} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#FAFAFA' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: p.color }}>
                  {p.phase}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#3F342D' }}>{p.label}</p>
                  <p className="text-xs" style={{ color: '#3F342D66' }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPhase('strength')}
            className="w-full py-4 rounded-2xl text-white font-medium text-sm"
            style={{ backgroundColor: '#FAA66B' }}
          >
            才能診断からはじめる
          </button>
        </div>
      </div>
    )
  }

  // ===== ローディング =====
  if (phase === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image src="/potori/humming.png" alt="ぽとり" width={100} height={100} className="object-contain" />
          </div>
          <h2 className="text-base font-medium mb-2" style={{ color: '#3F342D' }}>回答を送信しています...</h2>
          <div className="mt-4 flex gap-1 justify-center">
            {[0, 150, 300].map(d => (
              <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ===== エラー =====
  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Image src="/potori/comforting.png" alt="ぽとり" width={90} height={90} className="object-contain" />
          </div>
          <h2 className="text-base font-medium mb-2" style={{ color: '#3F342D' }}>エラーが発生しました</h2>
          <p className="text-sm mb-6" style={{ color: '#3F342D99' }}>{errorMsg}</p>
          <button
            onClick={() => setPhase('info')}
            className="w-full py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: '#FAA66B' }}
          >
            もう一度試す
          </button>
        </div>
      </div>
    )
  }

  // ===== 強み診断 =====
  if (phase === 'strength' && currentStrengthQ) {
    const progress = (strengthIdx / totalStrength) * 100
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF9F5' }}>
        <ProgressBar pct={progress} />
        <div className="flex-1 flex flex-col px-4 pt-8 max-w-sm mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
              才能診断
            </span>
            <span className="text-xs" style={{ color: '#3F342D66' }}>{strengthIdx + 1} / {totalStrength}</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs mb-2 text-center font-medium" style={{ color: '#FAA66B' }}>
              {currentStrengthQ.domain}｜{currentStrengthQ.talent}
            </p>
            <p className="text-base font-medium leading-relaxed mb-8 text-center" style={{ color: '#3F342D' }}>
              {currentStrengthQ.text}
            </p>
            <div className="space-y-3">
              {STRENGTH_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleStrengthSelect(opt.value)}
                  className="w-full text-left px-5 py-4 rounded-2xl transition-all duration-150 active:scale-95"
                  style={{ border: '1.5px solid #F0EAE5', backgroundColor: '#FFFFFF', color: '#3F342D' }}
                >
                  <span className="text-sm leading-relaxed">{opt.text}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="py-8">
            <button
              onClick={() => {
                if (strengthIdx === 0) { setPhase('intro'); return }
                setStrengthIdx(i => i - 1)
              }}
              className="w-full py-3 rounded-xl border text-sm"
              style={{ borderColor: '#E5DDD8', color: '#3F342D99' }}
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== 深層心理 =====
  if (phase === 'deep') {
    const q = DEEP_PSYCH_QUESTIONS[deepIdx]
    const progress = (deepIdx / 12) * 100
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF9F5' }}>
        <ProgressBar pct={progress} />
        <div className="flex-1 flex flex-col px-4 pt-8 max-w-sm mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#F0EEFF', color: '#9B8DD4' }}>
              深層心理
            </span>
            <span className="text-xs" style={{ color: '#3F342D66' }}>{deepIdx + 1} / 12</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs mb-3 text-center" style={{ color: '#9B8DD4' }}>直感で選んでください</p>
            <p className="text-base font-medium leading-relaxed mb-8 text-center" style={{ color: '#3F342D' }}>
              {q.text}
            </p>
            <div className="space-y-3">
              {q.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleDeepSelect(opt.value)}
                  className="w-full text-left px-5 py-4 rounded-2xl transition-all duration-150 active:scale-95"
                  style={{
                    border: `1.5px solid ${deepAnswers[deepIdx] === opt.value ? '#9B8DD4' : '#F0EAE5'}`,
                    backgroundColor: deepAnswers[deepIdx] === opt.value ? '#F0EEFF' : '#FFFFFF',
                    color: '#3F342D',
                  }}
                >
                  <span className="text-sm leading-relaxed">{opt.text}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="py-8">
            <button
              onClick={() => {
                if (deepIdx === 0) { setPhase('strength'); setStrengthIdx(totalStrength - 1); return }
                setDeepIdx(i => i - 1)
              }}
              className="w-full py-3 rounded-xl border text-sm"
              style={{ borderColor: '#E5DDD8', color: '#3F342D99' }}
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== スピリチュアル =====
  if (phase === 'spiritual') {
    const q = SPIRITUAL_QUESTIONS[spiritualIdx]
    const progress = (spiritualIdx / 6) * 100
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF9F5' }}>
        <ProgressBar pct={progress} />
        <div className="flex-1 flex flex-col px-4 pt-8 max-w-sm mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#E8F5F0', color: '#6BB5A0' }}>
              あなたの今
            </span>
            <span className="text-xs" style={{ color: '#3F342D66' }}>{spiritualIdx + 1} / 6</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs mb-3 text-center" style={{ color: '#6BB5A0' }}>直感で答えてください</p>
            <p className="text-base font-medium leading-relaxed mb-8 text-center whitespace-pre-line" style={{ color: '#3F342D' }}>
              {q.text}
            </p>
            {q.type === 'choice' ? (
              <div className="space-y-3">
                {q.options?.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSpiritualChoice(opt.value)}
                    className="w-full text-left px-5 py-4 rounded-2xl transition-all duration-150 active:scale-95"
                    style={{
                      border: `1.5px solid ${spiritualAnswers[spiritualIdx] === opt.value ? '#6BB5A0' : '#F0EAE5'}`,
                      backgroundColor: spiritualAnswers[spiritualIdx] === opt.value ? '#E8F5F0' : '#FFFFFF',
                      color: '#3F342D',
                    }}
                  >
                    <span className="text-sm leading-relaxed">{opt.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="ここに入力してください"
                  rows={4}
                  className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
                  style={{ border: '1.5px solid #F0EAE5', backgroundColor: '#FFFFFF', color: '#3F342D' }}
                />
                <button
                  onClick={handleSpiritualNext}
                  disabled={!textInput.trim()}
                  className="w-full mt-3 py-4 rounded-2xl text-white font-medium text-sm"
                  style={{ backgroundColor: textInput.trim() ? '#FAA66B' : '#F0C89F' }}
                >
                  {spiritualIdx < 5 ? '次へ' : '基本情報へ'}
                </button>
              </div>
            )}
          </div>
          <div className="py-8">
            <button
              onClick={() => {
                if (spiritualIdx === 0) { setPhase('deep'); setDeepIdx(11); return }
                setSpiritualIdx(i => i - 1)
                const prev = SPIRITUAL_QUESTIONS[spiritualIdx - 1]
                if (prev.type === 'text') setTextInput(spiritualAnswers[spiritualIdx - 1] ?? '')
                else setTextInput('')
              }}
              className="w-full py-3 rounded-xl border text-sm"
              style={{ borderColor: '#E5DDD8', color: '#3F342D99' }}
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== 基本情報 =====
  if (phase === 'info') {
    const canSubmit = birthday && worries.trim() && goals.trim()
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF9F5' }}>
        <ProgressBar pct={95} />
        <div className="flex-1 flex flex-col px-4 pt-8 max-w-sm mx-auto w-full">
          <div className="mb-6">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
              基本情報
            </span>
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#3F342D' }}>生年月日</label>
              <input
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{ border: '1.5px solid #F0EAE5', backgroundColor: '#FFFFFF', color: '#3F342D' }}
              />
              <p className="text-xs mt-1" style={{ color: '#3F342D66' }}>数秘・星座の算出に使用します</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#3F342D' }}>今、抱えている悩みや課題</label>
              <textarea
                value={worries}
                onChange={e => setWorries(e.target.value)}
                placeholder="例：仕事での人間関係が辛い、自分の強みが分からない..."
                rows={4}
                className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
                style={{ border: '1.5px solid #F0EAE5', backgroundColor: '#FFFFFF', color: '#3F342D' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#3F342D' }}>叶えたい目標・なりたい自分</label>
              <textarea
                value={goals}
                onChange={e => setGoals(e.target.value)}
                placeholder="例：自分らしく働きたい、人間関係を楽にしたい..."
                rows={4}
                className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
                style={{ border: '1.5px solid #F0EAE5', backgroundColor: '#FFFFFF', color: '#3F342D' }}
              />
            </div>
          </div>
          <div className="py-8 space-y-3">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-4 rounded-2xl text-white font-medium text-sm"
              style={{ backgroundColor: canSubmit ? '#FAA66B' : '#F0C89F' }}
            >
              レポートを生成する
            </button>
            <button
              onClick={() => { setPhase('spiritual'); setSpiritualIdx(5) }}
              className="w-full py-3 rounded-xl border text-sm"
              style={{ borderColor: '#E5DDD8', color: '#3F342D99' }}
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
