'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Mood = '良かった' | '普通' | 'しんどかったけど頑張った' | '悪かった'

const MOODS: { value: Mood; emoji: string; color: string; bg: string }[] = [
  { value: '良かった',           emoji: '😊', color: '#4AB87A', bg: '#EDF8F2' },
  { value: '普通',              emoji: '😐', color: '#C49A1A', bg: '#FDF8E1' },
  { value: 'しんどかったけど頑張った', emoji: '😤', color: '#5B8CC7', bg: '#EBF2FA' },
  { value: '悪かった',           emoji: '😞', color: '#D95A52', bg: '#FEF0EF' },
]

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

export default function MoodCheckClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = toDateStr(new Date())
  const [date, setDate] = useState(searchParams.get('date') ?? today)
  const [currentMood, setCurrentMood] = useState<Mood | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setSaved(false)
    fetch(`/api/counseling/mood-check?date=${date}`)
      .then(r => r.json())
      .then(d => setCurrentMood(d.mood ?? null))
      .finally(() => setLoading(false))
  }, [date])

  const select = async (mood: Mood) => {
    setSaving(true)
    try {
      await fetch('/api/counseling/mood-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, mood }),
      })
      setCurrentMood(mood)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const prevDay = () => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    const prev = toDateStr(d)
    // Allow up to 30 days back
    const limit = new Date()
    limit.setDate(limit.getDate() - 30)
    if (d >= limit) setDate(prev)
  }

  const nextDay = () => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    const next = toDateStr(d)
    if (next <= today) setDate(next)
  }

  const isToday = date === today

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFF9F5',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #F0EAE5',
          flexShrink: 0,
          gap: '12px',
        }}
      >
        <button
          onClick={() => router.push('/counseling')}
          style={{ padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 16l-6-6 6-6" stroke="#3F342D99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '15px', fontWeight: 600, color: '#3F342D' }}>
          気分チェック
        </div>
        <div style={{ width: '28px' }} />
      </div>

      {/* Date navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 8px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={prevDay}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: '#F0EAE5', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="#3F342D99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#3F342D' }}>
            {formatDate(date)}
          </div>
          {isToday && (
            <div style={{ fontSize: '11px', color: '#FAA66B', marginTop: '2px' }}>今日</div>
          )}
        </div>
        <button
          onClick={nextDay}
          disabled={isToday}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: isToday ? 'transparent' : '#F0EAE5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isToday ? 0.2 : 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="#3F342D99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px 24px', gap: '12px' }}>

        <p style={{ fontSize: '22px', fontWeight: 700, color: '#3F342D', textAlign: 'center', margin: '8px 0 16px' }}>
          今日の気分は？
        </p>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3F342D66' }}>
            読み込み中...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {MOODS.map(m => {
              const isSelected = currentMood === m.value
              return (
                <button
                  key={m.value}
                  onClick={() => select(m.value)}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '18px 20px',
                    borderRadius: '16px',
                    border: isSelected ? `2px solid ${m.color}` : '1.5px solid #F0EAE5',
                    backgroundColor: isSelected ? m.bg : '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: '28px', lineHeight: 1 }}>{m.emoji}</span>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: isSelected ? m.color : '#3F342D',
                    }}
                  >
                    {m.value}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: m.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Confirmation + actions */}
        {saved && (
          <div
            style={{
              marginTop: '8px',
              padding: '14px 16px',
              borderRadius: '14px',
              backgroundColor: '#F5F0EC',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '14px', color: '#3F342D', marginBottom: '12px' }}>
              記録しました ✓
            </p>
            {isToday && (
              <button
                onClick={() => router.push('/counseling/diary')}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FAA66B',
                  border: '1.5px solid #FAA66B',
                  borderRadius: '20px',
                  padding: '7px 20px',
                }}
              >
                日記も書く
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
