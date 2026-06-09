'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface SimpleItem { title: string; description: string }

interface SectionScores {
  section3: number
  section4: number
  section5: number
  section6: number
  section7: number
}

interface ContentFields {
  hardship_root: string
  hardship_root_steps: string[]
  hardship_root_tip: string
  core_pattern: string
  reaction_flow: string[]
  core_pattern_tip: string
  relationship_pattern: string
  relationship_steps: string[]
  relationship_tip: string
  boundary_setting: string
  boundary_steps: string[]
  boundary_tip: string
  ease_life: string
  ease_hints: SimpleItem[]
  recovery_hint: string
  recovery_hint_items: SimpleItem[]
  ideal_work: string
  ideal_work_jobs: SimpleItem[]
  growth_hint: string
  growth_hint_items: SimpleItem[]
  letter: string
}

interface Props {
  diagnosisId: string
  initialData?: Partial<ContentFields>
  scores?: SectionScores | null
}

function Skeleton({ generating }: { generating?: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {generating && (
        <div className="flex items-center gap-1.5 mb-4">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }} />
          ))}
          <span className="text-xs" style={{ color: '#FAA66B' }}>生成中です</span>
        </div>
      )}
      <div className="animate-pulse space-y-2">
        {[100, 80, 60].map((w, i) => (
          <div key={i} className="h-3 rounded" style={{ backgroundColor: '#F0EAE5', width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

function scoreLabel(s: number) { return s >= 12 ? '高め' : s >= 8 ? '中程度' : 'やや低め' }
function scoreColor(s: number) { return s >= 12 ? '#FAA66B' : s >= 8 ? '#8B8DD4' : '#6BB5A0' }

function StepFlow({ steps, labels, colors, bg }: {
  steps: string[]
  labels: string[]
  colors: string[]
  bg: string
}) {
  return (
    <div className="rounded-xl p-4 space-y-1 mt-4" style={{ backgroundColor: bg }}>
      {labels.map((label, i) => (
        <div key={i}>
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5"
              style={{ backgroundColor: colors[i] + '20', color: colors[i] }}>
              {label}
            </span>
            <p className="text-xs leading-relaxed pt-0.5" style={{ color: '#3F342D' }}>
              {steps[i]}
            </p>
          </div>
          {i < labels.length - 1 && (
            <div className="ml-3 w-0.5 h-3 my-0.5 rounded-full" style={{ backgroundColor: colors[i] + '40' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function RadarChart({ scores }: { scores: SectionScores }) {
  const n = 5, cx = 130, cy = 112, maxR = 75
  const axes = [
    { label: '消耗',     score: scores.section3 },
    { label: '人間関係', score: scores.section5 },
    { label: '感情処理', score: scores.section7 },
    { label: '自己基準', score: scores.section6 },
    { label: '回復',     score: scores.section4 },
  ]
  const pt = (pct: number, i: number): [number, number] => {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2
    return [cx + (pct / 100) * maxR * Math.cos(a), cy + (pct / 100) * maxR * Math.sin(a)]
  }
  const axPt = (ratio: number, i: number): [number, number] => {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2
    return [cx + ratio * maxR * Math.cos(a), cy + ratio * maxR * Math.sin(a)]
  }
  const toPath = (pts: [number, number][]) =>
    pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + 'Z'
  const dataPath = toPath(axes.map((a, i) => pt(((a.score - 4) / 12) * 100, i)))

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-sm font-bold mb-0.5" style={{ color: '#FAA66B' }}>あなたの特性プロフィール</h2>
      <p className="text-xs mb-3" style={{ color: '#3F342D66' }}>40問の回答から算出した5つの特性スコア</p>
      <svg viewBox="0 0 260 230" style={{ width: '100%', maxWidth: '260px', display: 'block', margin: '0 auto' }}>
        {[0.25, 0.5, 0.75, 1].map(ratio => (
          <path key={ratio} d={toPath(Array.from({ length: n }, (_, i) => axPt(ratio, i)))}
            fill="none" stroke="#E8DFD8" strokeWidth="0.75" />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const [x2, y2] = axPt(1, i)
          return <line key={i} x1={cx} y1={cy} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="#E8DFD8" strokeWidth="0.75" />
        })}
        <path d={dataPath} fill="#FAA66B22" stroke="#FAA66B" strokeWidth="2" strokeLinejoin="round" />
        {axes.map((axis, i) => {
          const a = (i * 2 * Math.PI / n) - Math.PI / 2
          const lx = cx + (maxR + 18) * Math.cos(a)
          const ly = cy + (maxR + 18) * Math.sin(a)
          const anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle'
          const baseline = Math.sin(a) < -0.3 ? 'auto' : Math.sin(a) > 0.3 ? 'hanging' : 'middle'
          return (
            <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)} fontSize="10"
              textAnchor={anchor} dominantBaseline={baseline} style={{ fill: '#3F342D99' }}>
              {axis.label}
            </text>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-1.5 justify-center mt-3">
        {axes.map((axis, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: scoreColor(axis.score) + '18', color: scoreColor(axis.score) }}>
            {axis.label}：{scoreLabel(axis.score)}
          </span>
        ))}
      </div>
    </div>
  )
}

function TipBox({ tip }: { tip: string }) {
  return (
    <div className="flex items-start gap-2 mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF2E8', border: '1px solid #FAA66B22' }}>
      <span className="text-sm shrink-0">💡</span>
      <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{tip}</p>
    </div>
  )
}

const HARDSHIP_LABELS = ['気質・特性', 'しんどくなる状況', '内側の動き', 'しんどさの形']
const HARDSHIP_COLORS = ['#C49A76', '#B08060', '#9C6648', '#885030']

const FLOW_LABELS = ['外的きっかけ', '内的解釈', '感情・身体反応', '行動', '結果']
const FLOW_COLORS = ['#FAA66B', '#F09060', '#E07050', '#D06040', '#C05030']

const RELATIONSHIP_LABELS = ['強みとして出ること', '起きやすいパターン', 'しんどくなる場面', '乗り越えのポイント']
const RELATIONSHIP_COLORS = ['#8B8DD4', '#7B7DC4', '#6B6DB4', '#5B5DA4']

const BOUNDARY_LABELS = ['消耗サイン', '必要な理由', '引き方', '自分への許可']
const BOUNDARY_COLORS = ['#6BB5A0', '#5BA090', '#4B8B80', '#3B7670']

export default function PaidResultStream({ diagnosisId, initialData, scores }: Props) {
  const router = useRouter()
  const [fields, setFields] = useState<Partial<ContentFields>>(initialData ?? {})
  const [streaming, setStreaming] = useState(!initialData?.letter)
  const retries = useRef(0)
  const esRef = useRef<EventSource | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)
  }, [])

  useEffect(() => {
    if (initialData?.letter) return

    function connect() {
      const es = new EventSource(`/api/diagnosis/paid/stream?diagnosisId=${encodeURIComponent(diagnosisId)}`)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as { done?: boolean; error?: string; field?: string; value?: unknown }
          if (data.done) {
            setStreaming(false)
            es.close()
            router.refresh()
          } else if (data.error) {
            es.close()
            if (retries.current < 2) { retries.current += 1; setTimeout(connect, 2000) }
            else setStreaming(false)
          } else if (data.field) {
            setFields(prev => ({ ...prev, [data.field!]: data.value }))
          }
        } catch {}
      }

      es.onerror = () => {
        es.close()
        if (retries.current < 2) { retries.current += 1; setTimeout(connect, 2000) }
        else setStreaming(false)
      }
    }

    connect()
    return () => { esRef.current?.close() }
  }, [diagnosisId, initialData])

  const generatingSection = !streaming ? null
    : !fields.hardship_root ? 'hardship_root'
    : !fields.core_pattern ? 'core_pattern'
    : !fields.relationship_pattern ? 'relationship_pattern'
    : !fields.boundary_setting ? 'boundary_setting'
    : !fields.ease_life ? 'ease_life'
    : !fields.recovery_hint ? 'recovery_hint'
    : !fields.ideal_work ? 'ideal_work'
    : !fields.growth_hint ? 'growth_hint'
    : !fields.letter ? 'letter'
    : null

  return (
    <div ref={topRef} className="space-y-4">

      {scores && <RadarChart scores={scores} />}

      {/* 1. しんどさの根っこ */}
      {fields.hardship_root ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🌱</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>しんどさの根っこ</h2>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{fields.hardship_root}</p>
          {fields.hardship_root_steps?.length === 4 && (
            <StepFlow steps={fields.hardship_root_steps} labels={HARDSHIP_LABELS} colors={HARDSHIP_COLORS} bg="#FFF8F2" />
          )}
          {fields.hardship_root_tip && <TipBox tip={fields.hardship_root_tip} />}
        </div>
      ) : <Skeleton generating={generatingSection === 'hardship_root'} />}

      {/* 2. 典型的な反応連鎖 */}
      {fields.core_pattern ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔄</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>典型的な反応連鎖</h2>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.core_pattern}</p>
          {fields.reaction_flow?.length === 5 && (
            <StepFlow steps={fields.reaction_flow} labels={FLOW_LABELS} colors={FLOW_COLORS} bg="#FFF8F2" />
          )}
          {fields.core_pattern_tip && <TipBox tip={fields.core_pattern_tip} />}
        </div>
      ) : <Skeleton generating={generatingSection === 'core_pattern'} />}

      {/* 3. 人間関係での傾向 */}
      {fields.relationship_pattern ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🤝</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>人間関係での傾向</h2>
            {scores && (() => {
              const s = scores.section5
              return <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
                style={{ backgroundColor: scoreColor(s) + '18', color: scoreColor(s) }}>{scoreLabel(s)}</span>
            })()}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{fields.relationship_pattern}</p>
          {fields.relationship_steps?.length === 4 && (
            <StepFlow steps={fields.relationship_steps} labels={RELATIONSHIP_LABELS} colors={RELATIONSHIP_COLORS} bg="#F5F0FA" />
          )}
          {fields.relationship_tip && <TipBox tip={fields.relationship_tip} />}
        </div>
      ) : <Skeleton generating={generatingSection === 'relationship_pattern'} />}

      {/* 4. 境界線の引き方 */}
      {fields.boundary_setting ? (
        <div className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FFF8F2' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🛡️</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>境界線の引き方</h2>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{fields.boundary_setting}</p>
          {fields.boundary_steps?.length === 4 && (
            <StepFlow steps={fields.boundary_steps} labels={BOUNDARY_LABELS} colors={BOUNDARY_COLORS} bg="#EEF7F4" />
          )}
          {fields.boundary_tip && <TipBox tip={fields.boundary_tip} />}
        </div>
      ) : <Skeleton generating={generatingSection === 'boundary_setting'} />}

      {/* 5. 生きづらさを和らげるヒント */}
      {fields.ease_life ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🌤️</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>生きづらさを和らげるヒント</h2>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.ease_life}</p>
          {fields.ease_hints && (
            <div className="grid grid-cols-2 gap-2">
              {fields.ease_hints.map((item, i) => (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#F0F4FF' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#8B8DD4' }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : <Skeleton generating={generatingSection === 'ease_life'} />}

      {/* 6. 回復のヒント */}
      {fields.recovery_hint ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🪜</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>回復のヒント</h2>
            {scores && (() => {
              const s = scores.section4
              return <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
                style={{ backgroundColor: scoreColor(s) + '18', color: scoreColor(s) }}>回復スタイル：{scoreLabel(s)}</span>
            })()}
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.recovery_hint}</p>
          {fields.recovery_hint_items && (
            <div className="grid grid-cols-2 gap-2">
              {fields.recovery_hint_items.map((item, i) => (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#FFF2E8' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : <Skeleton generating={generatingSection === 'recovery_hint'} />}

      {/* 7. 向いてる働き方・仕事 */}
      {fields.ideal_work ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💼</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>向いてる働き方・仕事</h2>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.ideal_work}</p>
          {fields.ideal_work_jobs && (
            <div className="grid grid-cols-2 gap-2">
              {fields.ideal_work_jobs.map((item, i) => (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#FFF2E8' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : <Skeleton generating={generatingSection === 'ideal_work'} />}

      {/* 8. 自己成長のヒント */}
      {fields.growth_hint ? (
        <div className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FFF8F2' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🗺️</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>自己成長のヒント</h2>
            {scores && (() => {
              const s = scores.section6
              return <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
                style={{ backgroundColor: scoreColor(s) + '18', color: scoreColor(s) }}>自己基準：{scoreLabel(s)}</span>
            })()}
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.growth_hint}</p>
          {fields.growth_hint_items && (
            <div className="grid grid-cols-2 gap-2">
              {fields.growth_hint_items.map((item, i) => (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#F0F4FF' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#8B8DD4' }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : <Skeleton generating={generatingSection === 'growth_hint'} />}

      {/* 9. 今のあなたへの手紙 */}
      {fields.letter ? (
        <div className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FFF2E8' }}>
          <div className="flex justify-center mb-3">
            <Image src="/potori/comforting.webp" alt="ぽとり" width={80} height={80} className="object-contain" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xl">💌</span>
            <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>今のあなたへの手紙</h2>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#3F342D' }}>
            {fields.letter.replace(/^.{1,20}さんへ[\r\n]+/, '')}
          </p>
        </div>
      ) : <Skeleton generating={generatingSection === 'letter'} />}
    </div>
  )
}
