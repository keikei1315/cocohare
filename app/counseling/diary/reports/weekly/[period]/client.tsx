'use client'

import { useRouter } from 'next/navigation'
import {
  WeeklyReportContent,
  ReportSkeleton,
} from '@/app/counseling/report/report-content'
import type { WeeklyReport } from '@/app/counseling/report/report-content'

function parseWeekLabel(period: string) {
  const [year, week] = period.split('-W')
  if (!year || !week) return period
  const y = parseInt(year)
  const w = parseInt(week)
  const jan4 = new Date(y, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const weekStart = new Date(startOfWeek1)
  weekStart.setDate(startOfWeek1.getDate() + (w - 1) * 7)
  const monthNum = weekStart.getMonth() + 1
  const weekOfMonth = Math.ceil(weekStart.getDate() / 7)
  return `${y}年${monthNum}月 第${weekOfMonth}週`
}

export default function WeeklyReportPage({
  period,
  report,
}: {
  period: string
  report: WeeklyReport | null
}) {
  const router = useRouter()

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
          onClick={() => router.push('/counseling/diary/reports')}
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
          一覧
        </button>
        <div className="text-center">
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#3F342D' }}>週間レポート</div>
          <div style={{ fontSize: '11px', color: '#3F342D66' }}>{parseWeekLabel(period)}</div>
        </div>
        <div style={{ width: '64px' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {report ? (
          <WeeklyReportContent report={report} />
        ) : (
          <div style={{ textAlign: 'center', padding: '64px 16px' }}>
            <p style={{ fontSize: '14px', color: '#3F342D66' }}>レポートが見つかりませんでした</p>
          </div>
        )}
      </div>
    </div>
  )
}
