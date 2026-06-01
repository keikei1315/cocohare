'use client'
import React from 'react'

export type MoodPoint = { date: string; score: number; label: string }

export type WeeklyReport = {
  summary: string
  core_values: string[]
  key_themes: string[]
  representative_quotes: string[]
  cautions: string[]
  next_steps: string[]
  moodData: MoodPoint[]
  todo_completed?: number
  todo_total?: number
}

export type MonthlyReport = {
  summary: string
  mood_pattern: string[]
  reaction_loops: string[]
  core_values: string[]
  hidden_needs: string[]
  core_beliefs_hypothesis: string[]
  mood_down_trigger: string[]
  mood_up_trigger: string[]
  protective_assets: string[]
  early_warning_signs: string[]
  next_month_theme: string
  next_actions: string[]
  if_then_plans: string[]
  uncertainty_guard: string
  moodData: MoodPoint[]
}

const MOOD_COLORS: Record<string, string> = {
  '5': '#7ECB99',
  '3': '#FAD46B',
  '2': '#FAA66B',
  '1': '#F9847A',
}

function getMoodColor(score: number) {
  if (score >= 5) return '#7ECB99'
  if (score >= 4) return '#A3D977'
  if (score >= 3) return '#FAD46B'
  if (score >= 2) return '#FAA66B'
  return '#F9847A'
}

export function MoodChart({ data }: { data: MoodPoint[] }) {
  if (!data.length) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', color: '#3F342D44', fontSize: '12px' }}>
        気分データなし
      </div>
    )
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', paddingBottom: '4px' }}>
        {data.map((d, i) => {
          const h = Math.max(6, (d.score / 5) * 56)
          const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ height: '56px', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  maxWidth: '28px',
                  minWidth: '12px',
                  height: `${h}px`,
                  backgroundColor: getMoodColor(d.score),
                  borderRadius: '4px 4px 0 0',
                }} />
              </div>
              <span style={{ fontSize: '9px', color: '#3F342D55', textAlign: 'center', lineHeight: 1.2 }}>{dateLabel}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
        {Object.entries(MOOD_COLORS).map(([score, color]) => {
          const labels: Record<string, string> = { '5': '良かった', '3': '普通', '2': 'しんどかったけど頑張った', '1': '悪かった' }
          const label = labels[score]
          if (!label) return null
          return (
            <div key={score} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: '#3F342D66' }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, color: '#FAA66B', letterSpacing: '0.06em', marginBottom: '8px' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

export function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? 'linear-gradient(135deg, #FAA66B22 0%, #F9847A22 100%)' : '#fff',
      border: `1px solid ${accent ? '#FAA66B33' : '#F0EAE5'}`,
      borderRadius: '14px',
      padding: '14px',
      boxShadow: accent ? 'none' : '0 1px 4px rgba(63,52,45,0.05)',
    }}>
      {children}
    </div>
  )
}

export function ListItems({ items, dot = '✦' }: { items: string[]; dot?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.filter(Boolean).map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ color: '#FAA66B', fontSize: '11px', marginTop: '3px', flexShrink: 0 }}>{dot}</span>
          <p style={{ fontSize: '13px', lineHeight: 1.65, color: '#3F342D', margin: 0 }}>{item}</p>
        </div>
      ))}
    </div>
  )
}

export function TagList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {items.filter(Boolean).map((item, i) => (
        <span key={i} style={{
          padding: '5px 12px',
          backgroundColor: '#FFF2E8',
          color: '#FAA66B',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
        }}>
          {item}
        </span>
      ))}
    </div>
  )
}

export function ReportSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ borderRadius: '14px', padding: '16px', backgroundColor: '#fff', border: '1px solid #F0EAE5' }}>
          <div style={{ height: '10px', borderRadius: '5px', width: '33%', backgroundColor: '#F0EAE5', marginBottom: '12px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ height: '10px', borderRadius: '5px', width: '100%', backgroundColor: '#F5F0EC' }} />
            <div style={{ height: '10px', borderRadius: '5px', width: '80%', backgroundColor: '#F5F0EC' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function WeeklyReportContent({ report }: { report: WeeklyReport }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Section label="今週のまとめ">
        <Card>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#3F342D' }}>{report.summary}</p>
        </Card>
      </Section>

      <Section label="気分の推移">
        <Card><MoodChart data={report.moodData ?? []} /></Card>
      </Section>

      {report.todo_total !== undefined && report.todo_total > 0 && (
        <Section label="じぶんTODO達成率">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '8px', borderRadius: '4px', backgroundColor: '#F0EAE5', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '4px',
                  backgroundColor: '#7ECB99',
                  width: `${Math.round((report.todo_completed ?? 0) / report.todo_total * 100)}%`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#3F342D', whiteSpace: 'nowrap' }}>
                {report.todo_completed ?? 0}/{report.todo_total}件（{Math.round((report.todo_completed ?? 0) / report.todo_total * 100)}%）
              </span>
            </div>
          </Card>
        </Section>
      )}

      <Section label="大切にしている価値観">
        <Card><ListItems items={report.core_values ?? []} /></Card>
      </Section>

      <Section label="今週よく出たテーマ">
        <Card><TagList items={report.key_themes ?? []} /></Card>
      </Section>

      <Section label="思考や感情の偏り・つまずきの原因">
        <Card><ListItems items={report.representative_quotes ?? []} /></Card>
      </Section>

      <Section label="気を付けたいポイント">
        <Card><ListItems items={report.cautions ?? []} dot="⚠" /></Card>
      </Section>

      <Section label="次の小さな一歩">
        <Card accent><ListItems items={report.next_steps ?? []} dot="→" /></Card>
      </Section>
    </div>
  )
}

export function MonthlyReportContent({ report }: { report: MonthlyReport }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Section label="今月の振り返り">
        <Card>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#3F342D' }}>{report.summary}</p>
        </Card>
      </Section>

      <Section label="気分の推移">
        <Card><MoodChart data={report.moodData ?? []} /></Card>
      </Section>

      <Section label="気分のクセ（よくある流れ）">
        <Card><ListItems items={report.mood_pattern ?? []} /></Card>
      </Section>

      <Section label="気分が動くパターン">
        <Card><ListItems items={report.reaction_loops ?? []} /></Card>
      </Section>

      <Section label="心の前提（思い込みの仮説）">
        <Card><ListItems items={report.core_beliefs_hypothesis ?? []} dot="💭" /></Card>
      </Section>

      <Section label="大切にしている価値観">
        <Card><ListItems items={report.core_values ?? []} /></Card>
      </Section>

      <Section label="心の奥で求めていること">
        <Card><ListItems items={report.hidden_needs ?? []} /></Card>
      </Section>

      <Section label="立ち直りを助ける力">
        <Card><ListItems items={report.protective_assets ?? []} dot="🌱" /></Card>
      </Section>

      <Section label="気分が下がりやすいきっかけ">
        <Card><ListItems items={report.mood_down_trigger ?? []} dot="↓" /></Card>
      </Section>

      <Section label="気分が上がるキッカケ">
        <Card><ListItems items={report.mood_up_trigger ?? []} dot="↑" /></Card>
      </Section>

      <Section label="気分ダウンのサイン（早めの気づき）">
        <Card><TagList items={report.early_warning_signs ?? []} /></Card>
      </Section>

      <Section label="今月のテーマ">
        <Card accent>
          <p style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.6, color: '#3F342D', textAlign: 'center' }}>
            {report.next_month_theme}
          </p>
        </Card>
      </Section>

      <Section label="来月の小さな行動">
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(report.next_actions ?? []).filter(Boolean).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  backgroundColor: '#FAA66B', color: '#fff',
                  fontSize: '11px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <p style={{ fontSize: '13px', lineHeight: 1.65, color: '#3F342D', margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section label="もし〜なら行動プラン">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(report.if_then_plans ?? []).filter(Boolean).map((item, i) => {
            const parts = item.split(/なら|then/i)
            return (
              <Card key={i}>
                {parts.length >= 2 ? (
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#FAA66B', marginBottom: '4px' }}>もし…</p>
                    <p style={{ fontSize: '13px', color: '#3F342D66', marginBottom: '8px', lineHeight: 1.5 }}>{parts[0].replace(/^もし/, '').trim()}</p>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#7ECB99', marginBottom: '4px' }}>→ そのときは</p>
                    <p style={{ fontSize: '13px', color: '#3F342D', lineHeight: 1.5 }}>{parts[1].trim()}</p>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', lineHeight: 1.65, color: '#3F342D', margin: 0 }}>{item}</p>
                )}
              </Card>
            )
          })}
        </div>
      </Section>

      <Section label="この分析で言い切れないこと">
        <div style={{ backgroundColor: '#F5F0EC', borderRadius: '14px', padding: '14px', border: '1px solid #EDE5DC' }}>
          <p style={{ fontSize: '12px', lineHeight: 1.65, color: '#3F342D88' }}>{report.uncertainty_guard}</p>
        </div>
      </Section>
    </div>
  )
}
