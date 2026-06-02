'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import GlobalNavDrawer from '@/app/components/GlobalNavDrawer'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

type CalendarData = {
  diaryDates: string[]
  positiveDates: string[]
  moodDates: string[]
  moodLevelByDate: Record<string, string>
  todoWeekData: Record<string, { completed: number; total: number }>
}

type DiaryEntry = {
  id?: string
  content: string
  mood_level: string | null
  positive_entries: string[]
  ai_content?: string
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay()
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function DiaryClient() {
  const router = useRouter()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [calData, setCalData] = useState<CalendarData>({
    diaryDates: [], positiveDates: [], moodDates: [], moodLevelByDate: {}, todoWeekData: {},
  })
  const [loading, setLoading] = useState(false)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [entry, setEntry] = useState<DiaryEntry>({ content: '', mood_level: null, positive_entries: ['', '', ''] })
  const [entryLoading, setEntryLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [globalMenuOpen, setGlobalMenuOpen] = useState(false)

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/counseling/diary/calendar?year=${y}&month=${m}`)
      const data = await res.json()
      setCalData(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalendar(year, month)
  }, [year, month, fetchCalendar])

  const openDiary = async (dateStr: string) => {
    setSelectedDate(dateStr)
    setSheetOpen(true)
    setEntryLoading(true)
    try {
      const res = await fetch(`/api/counseling/diary/entry?date=${dateStr}`)
      const data = await res.json()
      if (data.entry) {
        setEntry({
          content: data.entry.content || data.entry.ai_content || '',
          mood_level: data.entry.mood_level ?? null,
          positive_entries: data.entry.positive_entries?.length
            ? [...data.entry.positive_entries, '', '', ''].slice(0, 3)
            : ['', '', ''],
        })
      } else {
        setEntry({ content: '', mood_level: null, positive_entries: ['', '', ''] })
      }
    } finally {
      setEntryLoading(false)
    }
  }

  const saveEntry = async () => {
    if (!selectedDate) return
    setSaving(true)
    try {
      const res = await fetch('/api/counseling/diary/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          content: entry.content,
          mood_level: entry.mood_level,
          positive_entries: entry.positive_entries.filter(e => e.trim()),
        }),
      })
      if (res.ok) {
        setSheetOpen(false)
        fetchCalendar(year, month)
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('[diary save error]', res.status, data)
        alert(`保存に失敗しました (${res.status}): ${data.error ?? '不明なエラー'}`)
      }
    } catch (e) {
      console.error('[diary save error]', e)
      alert('保存に失敗しました。通信エラーが発生しました。')
    } finally {
      setSaving(false)
    }
  }

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const moodColor = (_mood: string | undefined) => '#FAA66B'

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
      <GlobalNavDrawer isOpen={globalMenuOpen} onClose={() => setGlobalMenuOpen(false)} />
      {/* Header */}
      <div
        style={{
          padding: '0 16px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F0EAE5',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push('/counseling/chat')}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            color: '#FAA66B', padding: '6px 10px',
            border: '1.5px solid #FAA66B', borderRadius: '20px',
            fontSize: '12px', fontWeight: 600,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11l-4-4 4-4" stroke="#FAA66B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          トーク
        </button>
        <div className="text-center">
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#3F342D' }}>ぽとりの日記</div>
          <div style={{ fontSize: '11px', color: '#3F342D66' }}>カレンダー</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={goToday}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#FAA66B',
              border: '1.5px solid #FAA66B',
              borderRadius: '20px',
              padding: '4px 10px',
            }}
          >
            今日
          </button>
          <button
            onClick={() => setGlobalMenuOpen(true)}
            style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '3.5px', alignItems: 'center', justifyContent: 'center' }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: '18px', height: '2px', borderRadius: '2px', backgroundColor: '#3F342D99' }} />
            ))}
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            fontSize: '12px',
            color: '#3F342D',
            backgroundColor: '#F0EAE5',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 12px',
          }}
        >
          前の月
        </button>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#3F342D' }}>
          {year}年{month}月
        </span>
        <button
          onClick={nextMonth}
          style={{
            fontSize: '12px',
            color: '#3F342D',
            backgroundColor: '#F0EAE5',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 12px',
          }}
        >
          次の月
        </button>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 500,
                padding: '4px 0',
                color: i === 0 ? '#F9847A' : i === 6 ? '#7EAACC' : '#3F342D99',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const dateStr = toDateStr(year, month, day)
            const isToday = dateStr === todayStr
            const hasDiary = calData.diaryDates.includes(dateStr)
            const hasMood = calData.moodDates.includes(dateStr)
            const hasPositive = calData.positiveDates.includes(dateStr)
            const moodLevel = calData.moodLevelByDate[dateStr]
            const isSun = (i % 7 === 0)
            const isSat = (i % 7 === 6)

            return (
              <button
                key={dateStr}
                onClick={() => openDiary(dateStr)}
                style={{
                  aspectRatio: '1',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  backgroundColor: isToday ? 'transparent' : '#fff',
                  border: isToday ? '2px solid #FAA66B' : '1px solid #F0EAE5',
                  cursor: 'pointer',
                  padding: '4px 2px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? '#FAA66B' : isSun ? '#F9847A' : isSat ? '#7EAACC' : '#3F342D',
                  }}
                >
                  {day}
                </span>
                <div style={{ display: 'flex', gap: '2px', height: '6px', alignItems: 'center' }}>
                  {hasMood && (
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: moodColor(moodLevel),
                      }}
                    />
                  )}
                  {hasDiary && (
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#7EAACC' }} />
                  )}
                  {hasPositive && (
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#FAD46B' }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', padding: '16px 0 8px', flexWrap: 'wrap' }}>
          {[
            { color: '#FAA66B', label: '気分' },
            { color: '#7EAACC', label: '日記' },
            { color: '#FAD46B', label: 'ポジティブ' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
              <span style={{ fontSize: '11px', color: '#3F342D99' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* TODO week list */}
        {Object.keys(calData.todoWeekData).length > 0 && (
          <div style={{ padding: '8px 8px 16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#FAA66B', marginBottom: '8px', paddingLeft: '4px' }}>
              じぶんTODO週間達成
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(calData.todoWeekData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([satDate, td]) => {
                  const d = new Date(satDate + 'T00:00:00')
                  const m = d.getMonth() + 1
                  let weekCount = 0
                  for (let day = 1; day <= d.getDate(); day++) {
                    if (new Date(d.getFullYear(), d.getMonth(), day).getDay() === 6) weekCount++
                  }
                  const allDone = td.completed === td.total
                  return (
                    <div key={satDate} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '12px',
                      backgroundColor: allDone ? '#F0FAF4' : '#fff',
                      border: `1px solid ${allDone ? '#7ECB9944' : '#F0EAE5'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{allDone ? '🏆' : '📋'}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#3F342D' }}>
                          {m}月第{weekCount}週
                        </span>
                      </div>
                      {allDone ? (
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          padding: '3px 10px', borderRadius: '20px',
                          backgroundColor: '#7ECB99', color: '#fff',
                        }}>
                          全達成！
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          padding: '3px 10px', borderRadius: '20px',
                          backgroundColor: '#FFF2E8', color: '#FAA66B',
                          border: '1px solid #FAA66B44',
                        }}>
                          {td.completed}/{td.total}達成
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid #F0EAE5',
          backgroundColor: '#FFF9F5',
          height: '60px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            backgroundColor: '#FFF2E8',
          }}
        >
          <span style={{ fontSize: '18px' }}>📅</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#FAA66B' }}>カレンダー</span>
        </div>
        <button
          onClick={() => router.push('/counseling/diary/reports')}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
          }}
        >
          <span style={{ fontSize: '18px' }}>📈</span>
          <span style={{ fontSize: '11px', color: '#3F342D66' }}>分析レポート</span>
        </button>
      </div>

      {/* Bottom sheet backdrop */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(63,52,45,0.4)',
            zIndex: 10,
          }}
        />
      )}

      {/* Bottom sheet */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderRadius: '20px 20px 0 0',
          zIndex: 20,
          maxHeight: '85vh',
          overflow: 'auto',
          transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease',
        }}
      >
        {selectedDate && (
          <div style={{ padding: '20px 16px 32px' }}>
            {/* Sheet header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#3F342D' }}>{selectedDate}</div>
                <div style={{ fontSize: '12px', color: '#3F342D66' }}>選択した日の日記</div>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                style={{
                  fontSize: '13px',
                  color: '#3F342D99',
                  border: '1px solid #E5DDD8',
                  borderRadius: '20px',
                  padding: '4px 12px',
                }}
              >
                閉じる
              </button>
            </div>

            {entryLoading ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#3F342D66' }}>読み込み中...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Mood */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FAA66B', display: 'inline-block' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#3F342D' }}>今日の気分</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {(['良かった', '普通', 'しんどかったけど頑張った', '悪かった'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => setEntry(e => ({ ...e, mood_level: e.mood_level === level ? null : level }))}
                        style={{
                          padding: '10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          border: entry.mood_level === level ? '2px solid #FAA66B' : '1.5px solid #E5DDD8',
                          backgroundColor: entry.mood_level === level ? '#FFF2E8' : '#fff',
                          color: entry.mood_level === level ? '#FAA66B' : '#3F342D',
                        }}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diary content */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7EAACC', display: 'inline-block' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#3F342D' }}>今日の出来事（日記）</span>
                  </div>
                  <textarea
                    value={entry.content}
                    onChange={e => setEntry(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="できたこと、しんどかったこと、気づいたことなど。"
                    rows={4}
                    style={{
                      width: '100%',
                      resize: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '14px',
                      outline: 'none',
                      border: '1.5px solid #E5DDD8',
                      backgroundColor: '#FAFAF8',
                      color: '#3F342D',
                      lineHeight: 1.6,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Positive diary */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FAD46B', display: 'inline-block' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#3F342D' }}>ポジティブ日記（3行）</span>
                  </div>
                  {entry.positive_entries.map((pe, idx) => (
                    <input
                      key={idx}
                      value={pe}
                      onChange={e => {
                        const updated = [...entry.positive_entries]
                        updated[idx] = e.target.value
                        setEntry(prev => ({ ...prev, positive_entries: updated }))
                      }}
                      placeholder={
                        idx === 0 ? '朝のコーヒーが美味しかった（任意）'
                        : idx === 1 ? 'クスっと笑えた些細な出来事（任意）'
                        : '今日の小さな達成感（任意）'
                      }
                      style={{
                        width: '100%',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        fontSize: '13px',
                        outline: 'none',
                        border: '1.5px solid #E5DDD8',
                        backgroundColor: '#FAFAF8',
                        color: '#3F342D',
                        marginBottom: idx < 2 ? '8px' : '0',
                        boxSizing: 'border-box',
                      }}
                    />
                  ))}
                </div>

                {/* Save button */}
                <button
                  onClick={saveEntry}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    backgroundColor: saving ? '#E5DDD8' : '#FAA66B',
                    color: saving ? '#3F342D66' : '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? '保存中...' : '日記を保存する'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
