'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  WeeklyReportContent,
  MonthlyReportContent,
  ReportSkeleton,
  Card,
} from '@/app/counseling/report/report-content'
import type { WeeklyReport, MonthlyReport } from '@/app/counseling/report/report-content'

type Note = { id: string; type: string; input_concern: string; content: string; created_at: string }
type Tab = 'weekly' | 'monthly' | 'notes'

export default function ReportClient({ initialNotes }: { initialNotes: Note[] }) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const typeParam = searchParams.get('type') as 'weekly' | 'monthly' | null
  const periodParam = searchParams.get('period')

  const [tab, setTab] = useState<Tab>(typeParam ?? tabParam ?? 'weekly')
  const [notes, setNotes] = useState(initialNotes)

  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null)
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [weeklyError, setWeeklyError] = useState<'error' | 'no_data' | null>(null)
  const [weeklyPeriod, setWeeklyPeriod] = useState('')

  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyError, setMonthlyError] = useState<'error' | 'no_data' | null>(null)
  const [monthlyPeriod, setMonthlyPeriod] = useState('')

  const [noteFormOpen, setNoteFormOpen] = useState(false)
  const [noteConcern, setNoteConcern] = useState('')
  const [noteSituation, setNoteSituation] = useState('')
  const [noteAi, setNoteAi] = useState(true)
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    if (tab === 'weekly' && !weeklyReport && !weeklyLoading) {
      setWeeklyLoading(true)
      setWeeklyError(null)
      const url = periodParam && typeParam === 'weekly'
        ? `/api/counseling/report/weekly?period=${periodParam}`
        : '/api/counseling/report/weekly'
      fetch(url)
        .then(async r => {
          if (r.status === 422 || r.status === 404) { setWeeklyError('no_data'); return }
          if (!r.ok) { setWeeklyError('error'); return }
          const d = await r.json()
          setWeeklyReport(d.report)
          setWeeklyPeriod(d.period)
        })
        .catch(() => setWeeklyError('error'))
        .finally(() => setWeeklyLoading(false))
    }
  }, [tab]) // eslint-disable-line

  useEffect(() => {
    if (tab === 'monthly' && !monthlyReport && !monthlyLoading) {
      setMonthlyLoading(true)
      setMonthlyError(null)
      const url = periodParam && typeParam === 'monthly'
        ? `/api/counseling/report/monthly?period=${periodParam}`
        : '/api/counseling/report/monthly'
      fetch(url)
        .then(async r => {
          if (r.status === 422 || r.status === 404) { setMonthlyError('no_data'); return }
          if (!r.ok) { setMonthlyError('error'); return }
          const d = await r.json()
          setMonthlyReport(d.report)
          setMonthlyPeriod(d.period)
        })
        .catch(() => setMonthlyError('error'))
        .finally(() => setMonthlyLoading(false))
    }
  }, [tab]) // eslint-disable-line

  const saveNote = async () => {
    if (!noteConcern.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/counseling/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_concern: noteConcern, input_situation: noteSituation, generateAi: noteAi }),
      })
      const data = await res.json()
      if (data.note) {
        setNotes(prev => [data.note, ...prev])
        setNoteConcern('')
        setNoteSituation('')
        setNoteAi(true)
        setNoteFormOpen(false)
      }
    } finally {
      setSavingNote(false)
    }
  }

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    await fetch(`/api/counseling/note/${id}`, { method: 'DELETE' })
  }

  const retry = (type: 'weekly' | 'monthly') => {
    if (type === 'weekly') { setWeeklyReport(null); setWeeklyError(null); setWeeklyLoading(false); setTab('monthly'); setTimeout(() => setTab('weekly'), 50) }
    else { setMonthlyReport(null); setMonthlyError(null); setMonthlyLoading(false); setTab('weekly'); setTimeout(() => setTab('monthly'), 50) }
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1,
    paddingTop: '10px',
    paddingBottom: '10px',
    fontSize: '13px',
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? '#FAA66B' : '#3F342D66',
    borderBottom: tab === t ? '2px solid #FAA66B' : '2px solid transparent',
    backgroundColor: 'transparent',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#FFF9F5' }}>
      <div style={{ padding: '48px 16px 8px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#3F342D' }}>レポート</h1>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #F0EAE5', backgroundColor: '#FFF9F5' }}>
        <button style={tabStyle('weekly')} onClick={() => setTab('weekly')}>週間</button>
        <button style={tabStyle('monthly')} onClick={() => setTab('monthly')}>月間</button>
        <button style={tabStyle('notes')} onClick={() => setTab('notes')}>ノート</button>
      </div>

      <div style={{ padding: '16px' }}>

        {tab === 'weekly' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {weeklyPeriod && <p style={{ fontSize: '11px', color: '#3F342D66' }}>{weeklyPeriod} のレポート</p>}
            {weeklyLoading && <ReportSkeleton />}
            {weeklyError === 'no_data' && (
              <Card>
                <p style={{ fontSize: '14px', color: '#3F342D99', textAlign: 'center', lineHeight: 1.7 }}>
                  まだデータが足りません{'\n'}会話や気分記録を続けると生成されます
                </p>
              </Card>
            )}
            {weeklyError === 'error' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '14px', color: '#3F342D66', marginBottom: '12px' }}>レポートの生成に失敗しました</p>
                <button
                  onClick={() => retry('weekly')}
                  style={{ padding: '8px 20px', borderRadius: '20px', backgroundColor: '#FAA66B', color: '#fff', fontSize: '13px', fontWeight: 600 }}
                >
                  もう一度試す
                </button>
              </div>
            )}
            {weeklyReport && <WeeklyReportContent report={weeklyReport} />}
          </div>
        )}

        {tab === 'monthly' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {monthlyPeriod && <p style={{ fontSize: '11px', color: '#3F342D66' }}>{monthlyPeriod} のレポート</p>}
            {monthlyLoading && <ReportSkeleton />}
            {monthlyError === 'no_data' && (
              <Card>
                <p style={{ fontSize: '14px', color: '#3F342D99', textAlign: 'center', lineHeight: 1.7 }}>
                  まだデータが足りません{'\n'}会話や気分記録を続けると生成されます
                </p>
              </Card>
            )}
            {monthlyError === 'error' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '14px', color: '#3F342D66', marginBottom: '12px' }}>レポートの生成に失敗しました</p>
                <button
                  onClick={() => retry('monthly')}
                  style={{ padding: '8px 20px', borderRadius: '20px', backgroundColor: '#FAA66B', color: '#fff', fontSize: '13px', fontWeight: 600 }}
                >
                  もう一度試す
                </button>
              </div>
            )}
            {monthlyReport && <MonthlyReportContent report={monthlyReport} />}
          </div>
        )}

        {tab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!noteFormOpen ? (
              <button
                onClick={() => setNoteFormOpen(true)}
                style={{ width: '100%', padding: '12px', borderRadius: '14px', backgroundColor: '#FAA66B', color: '#fff', fontSize: '14px', fontWeight: 600 }}
              >
                + じぶんノートを作る
              </button>
            ) : (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#3F342D' }}>じぶんノートを作る</p>
                  <button onClick={() => setNoteFormOpen(false)} style={{ color: '#3F342D66', fontSize: '16px' }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#3F342D99', display: 'block', marginBottom: '6px' }}>
                      気になっていること・悩み <span style={{ color: '#FAA66B' }}>*</span>
                    </label>
                    <textarea
                      value={noteConcern}
                      onChange={e => setNoteConcern(e.target.value)}
                      placeholder="最近気になっていること、モヤモヤしていること..."
                      rows={3}
                      style={{ width: '100%', resize: 'none', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', outline: 'none', border: '1.5px solid #F0EAE5', backgroundColor: '#FFF9F5', color: '#3F342D', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#3F342D99', display: 'block', marginBottom: '6px' }}>状況・背景（任意）</label>
                    <textarea
                      value={noteSituation}
                      onChange={e => setNoteSituation(e.target.value)}
                      placeholder="いつ頃から？どんな場面で？"
                      rows={2}
                      style={{ width: '100%', resize: 'none', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', outline: 'none', border: '1.5px solid #F0EAE5', backgroundColor: '#FFF9F5', color: '#3F342D', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    onClick={() => setNoteAi(!noteAi)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', backgroundColor: noteAi ? '#FFF2E8' : '#F9F5F0', border: `1.5px solid ${noteAi ? '#FAA66B66' : '#F0EAE5'}`, textAlign: 'left' }}
                  >
                    <span style={{ width: '32px', height: '18px', borderRadius: '9px', position: 'relative', display: 'flex', alignItems: 'center', backgroundColor: noteAi ? '#FAA66B' : '#D9D2CC', flexShrink: 0 }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', transition: 'left 0.15s', left: noteAi ? '16px' : '2px' }} />
                    </span>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#3F342D', margin: 0 }}>ぽとりに言語化してもらう</p>
                      <p style={{ fontSize: '11px', color: '#3F342D66', margin: 0 }}>AIが気持ちを丁寧に言語化します</p>
                    </div>
                  </button>
                  <button
                    onClick={saveNote}
                    disabled={!noteConcern.trim() || savingNote}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, backgroundColor: noteConcern.trim() && !savingNote ? '#FAA66B' : '#F0EAE5', color: noteConcern.trim() && !savingNote ? '#fff' : '#3F342D66', transition: 'all 0.15s' }}
                  >
                    {savingNote ? (noteAi ? 'ぽとりが言語化中...' : '保存中...') : 'ノートを作る'}
                  </button>
                </div>
              </Card>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notes.map(note => (
                <Card key={note.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#3F342D66' }}>
                        {new Date(note.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </span>
                      {note.type === 'ai_assisted' && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#FFF2E8', color: '#FAA66B' }}>✦ ぽとり</span>
                      )}
                    </div>
                    <button onClick={() => deleteNote(note.id)} style={{ color: '#3F342D33', fontSize: '14px', padding: '2px' }}>✕</button>
                  </div>
                  {note.input_concern && (
                    <p style={{ fontSize: '11px', color: '#3F342D66', marginBottom: '6px' }}>「{note.input_concern}」</p>
                  )}
                  <p style={{ fontSize: '13px', lineHeight: 1.65, color: '#3F342D', margin: 0 }}>{note.content}</p>
                </Card>
              ))}
              {notes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ fontSize: '14px', color: '#3F342D99', marginBottom: '4px' }}>じぶんノートがありません</p>
                  <p style={{ fontSize: '12px', color: '#3F342D66' }}>気持ちをぽとりと一緒に言語化しましょう</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
