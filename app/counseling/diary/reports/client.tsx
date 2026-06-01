'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  WeeklyReportContent,
  MonthlyReportContent,
  ReportSkeleton,
} from '@/app/counseling/report/report-content'
import type { WeeklyReport, MonthlyReport } from '@/app/counseling/report/report-content'

type ReportItem = { id: string; type: string; period: string; created_at: string }
type Tab = 'weekly' | 'monthly'

function parseWeekPeriod(period: string) {
  const [year, week] = period.split('-W')
  if (!year || !week) return { label: period, start: '', end: '' }

  const y = parseInt(year)
  const w = parseInt(week)
  const jan4 = new Date(y, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const weekStart = new Date(startOfWeek1)
  weekStart.setDate(startOfWeek1.getDate() + (w - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const monthNum = weekStart.getMonth() + 1
  const weekOfMonth = Math.ceil(weekStart.getDate() / 7)

  return {
    label: `${y}年${monthNum}月 第${weekOfMonth}週`,
    start: fmt(weekStart),
    end: fmt(weekEnd),
  }
}

export default function ReportListClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = new Date()

  const [tab, setTab] = useState<Tab>('weekly')
  const [reports, setReports] = useState<{ weekly: ReportItem[]; monthly: ReportItem[] }>({
    weekly: [], monthly: [],
  })
  const [loading, setLoading] = useState(true)

  // Weekly filter
  const [filterYear, setFilterYear] = useState(today.getFullYear())
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1)

  // Weekly expand
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null)
  const [expandedReport, setExpandedReport] = useState<WeeklyReport | null>(null)
  const [expandLoading, setExpandLoading] = useState(false)

  // Monthly year/month select
  const [monthlyYear, setMonthlyYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(today.getMonth() + 1)
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyError, setMonthlyError] = useState<'no_data' | 'error' | null>(null)

  useEffect(() => {
    fetch('/api/counseling/report/list')
      .then(r => r.json())
      .then(d => setReports({ weekly: d.weekly ?? [], monthly: d.monthly ?? [] }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const month = today.getMonth() + 1
    const period = `${today.getFullYear()}-${String(month).padStart(2, '0')}`
    setMonthlyLoading(true)
    fetch(`/api/counseling/report/monthly?period=${period}`)
      .then(async r => {
        if (r.status === 404 || r.status === 422) { setMonthlyError('no_data'); return }
        if (!r.ok) { setMonthlyError('error'); return }
        const d = await r.json()
        setMonthlyReport(d.report)
      })
      .catch(() => setMonthlyError('error'))
      .finally(() => setMonthlyLoading(false))
  }, []) // eslint-disable-line

  const filterStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}`
  const filteredWeekly = reports.weekly.filter(r => {
    const { start } = parseWeekPeriod(r.period)
    return start.startsWith(filterStr)
  })

  const prevMonth = () => {
    setExpandedPeriod(null); setExpandedReport(null)
    if (filterMonth === 1) { setFilterYear(y => y - 1); setFilterMonth(12) }
    else setFilterMonth(m => m - 1)
  }
  const nextMonth = () => {
    setExpandedPeriod(null); setExpandedReport(null)
    if (filterMonth === 12) { setFilterYear(y => y + 1); setFilterMonth(1) }
    else setFilterMonth(m => m + 1)
  }

  const prevYear = () => {
    setMonthlyYear(y => y - 1)
    setSelectedMonth(null); setMonthlyReport(null); setMonthlyError(null)
  }
  const nextYear = () => {
    setMonthlyYear(y => y + 1)
    setSelectedMonth(null); setMonthlyReport(null); setMonthlyError(null)
  }

  const handleWeekClick = useCallback(async (period: string) => {
    if (expandedPeriod === period) {
      setExpandedPeriod(null); setExpandedReport(null)
      return
    }
    setExpandedPeriod(period)
    setExpandedReport(null)
    setExpandLoading(true)
    try {
      const res = await fetch(`/api/counseling/report/weekly?period=${period}`)
      if (!res.ok) return
      const d = await res.json()
      setExpandedReport(d.report)
    } finally {
      setExpandLoading(false)
    }
  }, [expandedPeriod])

  // URLパラメータで特定レポートを自動表示
  // ?period=2026-W22 → 週間レポートを自動展開
  // ?tab=monthly&period=2026-05 → 月間タブに切替してそのレポートを表示
  useEffect(() => {
    if (loading) return
    const tabParam = searchParams.get('tab')
    const periodParam = searchParams.get('period')

    if (tabParam === 'monthly') {
      setTab('monthly')
      if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
        const [y, m] = periodParam.split('-').map(Number)
        setMonthlyYear(y)
        handleMonthClick(m)
      }
      return
    }

    if (periodParam) {
      const { start } = parseWeekPeriod(periodParam)
      if (start) {
        const [y, m] = start.split('-').map(Number)
        setFilterYear(y)
        setFilterMonth(m)
      }
      handleWeekClick(periodParam)
    }
  }, [loading, searchParams]) // eslint-disable-line

  const handleMonthClick = async (month: number) => {
    if (selectedMonth === month) {
      setSelectedMonth(null); setMonthlyReport(null); setMonthlyError(null)
      return
    }
    setSelectedMonth(month)
    setMonthlyReport(null); setMonthlyError(null)
    setMonthlyLoading(true)
    const period = `${monthlyYear}-${String(month).padStart(2, '0')}`
    try {
      const res = await fetch(`/api/counseling/report/monthly?period=${period}`)
      if (res.status === 404 || res.status === 422) { setMonthlyError('no_data'); return }
      if (!res.ok) { setMonthlyError('error'); return }
      const d = await res.json()
      setMonthlyReport(d.report)
    } finally {
      setMonthlyLoading(false)
    }
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '20px',
    border: 'none',
    backgroundColor: tab === t ? '#FAA66B' : 'transparent',
    color: tab === t ? '#fff' : '#3F342D99',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  const ChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 12l-4-4 4-4" stroke="#3F342D99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  const ChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 12l4-4-4-4" stroke="#3F342D99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

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
          <div style={{ fontSize: '11px', color: '#3F342D66' }}>分析レポート</div>
        </div>
        <button
          onClick={() => { setFilterYear(today.getFullYear()); setFilterMonth(today.getMonth() + 1) }}
          style={{
            fontSize: '12px', fontWeight: 500, color: '#FAA66B',
            border: '1.5px solid #FAA66B', borderRadius: '20px', padding: '4px 10px',
          }}
        >
          今日
        </button>
      </div>

      {/* Tab selector */}
      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', backgroundColor: '#F0EAE5', borderRadius: '24px', padding: '3px' }}>
          <button style={tabStyle('weekly')} onClick={() => setTab('weekly')}>週間</button>
          <button style={tabStyle('monthly')} onClick={() => setTab('monthly')}>月間</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>

        {/* ── 週間タブ ── */}
        {tab === 'weekly' && (
          <div>
            {/* Year-month filter */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#fff', borderRadius: '12px', padding: '10px 14px',
                border: '1px solid #F0EAE5', marginBottom: '12px',
              }}
            >
              <button onClick={prevMonth} style={{ padding: '0 4px' }}><ChevronLeft /></button>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#3F342D' }}>
                年月　{filterYear}年{filterMonth}月
              </span>
              <button onClick={nextMonth} style={{ padding: '0 4px' }}><ChevronRight /></button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#3F342D66' }}>読み込み中...</div>
            ) : filteredWeekly.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                <p style={{ fontSize: '14px', color: '#3F342D66', marginBottom: '8px' }}>
                  {filterYear}年{filterMonth}月のレポートはまだありません
                </p>
                <p style={{ fontSize: '12px', color: '#3F342D44' }}>
                  日記や気分を記録すると週間レポートが生成されます
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredWeekly.map(item => {
                  const { label, start, end } = parseWeekPeriod(item.period)
                  const isExpanded = expandedPeriod === item.period
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => handleWeekClick(item.period)}
                        style={{
                          width: '100%',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          backgroundColor: '#fff',
                          borderRadius: isExpanded ? '14px 14px 0 0' : '14px',
                          padding: '16px',
                          border: '1px solid #F0EAE5',
                          borderBottom: isExpanded ? '1px solid #FAA66B22' : '1px solid #F0EAE5',
                          textAlign: 'left', cursor: 'pointer',
                          boxShadow: '0 1px 4px rgba(63,52,45,0.05)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: '#3F342D', marginBottom: '4px' }}>
                            {label}
                          </div>
                          <div style={{ fontSize: '12px', color: '#3F342D66' }}>
                            {start} 〜 {end}
                          </div>
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 16 16" fill="none"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                        >
                          <path d="M6 12l4-4-4-4" stroke="#3F342D66" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div
                          style={{
                            backgroundColor: '#FDFAF7',
                            border: '1px solid #F0EAE5',
                            borderTop: 'none',
                            borderRadius: '0 0 14px 14px',
                            padding: '16px',
                          }}
                        >
                          {expandLoading && !expandedReport ? (
                            <ReportSkeleton />
                          ) : expandedReport ? (
                            <WeeklyReportContent report={expandedReport} />
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 月間タブ ── */}
        {tab === 'monthly' && (
          <div>
            {/* Year filter */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#fff', borderRadius: '12px', padding: '10px 14px',
                border: '1px solid #F0EAE5', marginBottom: '16px',
              }}
            >
              <button onClick={prevYear} style={{ padding: '0 4px' }}><ChevronLeft /></button>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#3F342D' }}>
                年　{monthlyYear}年
              </span>
              <button onClick={nextYear} style={{ padding: '0 4px' }}><ChevronRight /></button>
            </div>

            {/* Month grid 3×4 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                const isSelected = selectedMonth === month
                const hasPeriod = reports.monthly.some(
                  r => r.period === `${monthlyYear}-${String(month).padStart(2, '0')}`
                )
                return (
                  <button
                    key={month}
                    onClick={() => handleMonthClick(month)}
                    style={{
                      padding: '14px 8px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? '#FAA66B' : hasPeriod ? '#FFF2E8' : '#fff',
                      color: isSelected ? '#fff' : hasPeriod ? '#FAA66B' : '#3F342D99',
                      border: isSelected ? '1.5px solid #FAA66B' : hasPeriod ? '1.5px solid #FAA66B44' : '1px solid #F0EAE5',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {month}月
                  </button>
                )
              })}
            </div>

            {/* Selected month report */}
            {selectedMonth !== null && (
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '14px',
                  border: '1px solid #F0EAE5',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: '1px solid #F0EAE5',
                    backgroundColor: '#FFF2E8',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#3F342D' }}>
                    {monthlyYear}年{selectedMonth}月の月間レポート
                  </span>
                  <button
                    onClick={() => { setSelectedMonth(null); setMonthlyReport(null); setMonthlyError(null) }}
                    style={{
                      fontSize: '12px', fontWeight: 600, color: '#FAA66B',
                      border: '1px solid #FAA66B', borderRadius: '12px', padding: '4px 10px',
                    }}
                  >
                    閉じる
                  </button>
                </div>

                <div style={{ padding: '16px' }}>
                  {monthlyLoading ? (
                    <ReportSkeleton />
                  ) : monthlyError === 'no_data' ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <p style={{ fontSize: '14px', color: '#3F342D66', marginBottom: '6px' }}>まだ生成されていません</p>
                      <p style={{ fontSize: '12px', color: '#3F342D44' }}>会話や気分記録を続けると生成されます</p>
                    </div>
                  ) : monthlyError === 'error' ? (
                    <p style={{ textAlign: 'center', fontSize: '14px', color: '#3F342D66', padding: '24px 0' }}>
                      読み込みに失敗しました
                    </p>
                  ) : monthlyReport ? (
                    <MonthlyReportContent report={monthlyReport} />
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div
        style={{
          display: 'flex', borderTop: '1px solid #F0EAE5',
          backgroundColor: '#FFF9F5', height: '60px', flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push('/counseling/diary')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}
        >
          <span style={{ fontSize: '18px' }}>📅</span>
          <span style={{ fontSize: '11px', color: '#3F342D66' }}>カレンダー</span>
        </button>
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '2px', backgroundColor: '#FFF2E8',
          }}
        >
          <span style={{ fontSize: '18px' }}>📈</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#FAA66B' }}>分析レポート</span>
        </div>
      </div>
    </div>
  )
}
