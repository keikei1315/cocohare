'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface HtTalent {
  rank: number; name: string; domain: string; tagline: string
  description: string; shines_when: string; watch_out: string; career_hint: string
  tip?: string
}
interface HtSummary { title: string; body: string }
interface HtStrengths {
  top5: HtTalent[]
  synergy_note?: string
  domain_summary: string
  relationship_pattern: string
}
interface HtCoreInsight { essence: string; unlock: string; blindspot: string }
interface HtCommunicationStyle {
  description: string; strengths: string; cautions: string
  tips: string[]; best_roles: string[]
}
interface HtTalentShadowItem { talent: string; light: string; shadow: string; switch: string }
interface HtRelationshipBlueprint {
  overview: string
  compatible_types: string[]
  boundaries: string
  connection_tips: string[]
  distance_hint: string
}
interface HtEnergyMap {
  charge_sources: string[]
  drain_sources: string[]
  warning_signs: string
  rhythm_hint: string
}
interface HtHardshipCore {
  root_pattern: string
  defense_origin: string
  strength_shadow: string
  reframe_hints: string[]
  daily_awareness: string
}
interface HtSpiritual {
  numerology_reading: string; zodiac_reading: string
  current_stage: string; universe_message: string
}
interface HtRoadmap { actions: { period: string; action: string }[]; encouragement: string }
interface HtSelfcare {
  selfcare_actions: { period: string; action: string }[]
  manual: string; recovery_actions: string[]; my_rules: string[]
}

export interface ContentFields {
  summary: HtSummary
  strengths: HtStrengths
  core_insight: HtCoreInsight
  hardship_core: HtHardshipCore
  communication_style: HtCommunicationStyle
  talent_shadow: HtTalentShadowItem[]
  relationship_blueprint: HtRelationshipBlueprint
  energy_map: HtEnergyMap
  spiritual: HtSpiritual
  roadmap: HtRoadmap
  selfcare: HtSelfcare
  inner_child: string
  letter: string
}

export interface TalentData {
  domainScores: { domain: string; total: number; pct: number }[]
  allRanking: { talent: string; domain: string; score: number }[]
}

interface Props {
  diagnosisId: string
  initialData?: Partial<ContentFields>
  talentData?: TalentData | null
}

const DOMAIN_COLORS: Record<string, string> = {
  '関係力': '#FAA66B',
  '思考力': '#8B8DD4',
  '実行力': '#6BB5A0',
  '表現力': '#F0877A',
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

function DomainRadarChart({ domainScores }: { domainScores: { domain: string; total: number; pct: number }[] }) {
  const n = 4, cx = 120, cy = 110, maxR = 72
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
  const dataPath = toPath(domainScores.map((d, i) => pt(d.pct, i)))

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-sm font-bold mb-0.5" style={{ color: '#FAA66B' }}>才能ドメインバランス</h2>
      <p className="text-xs mb-3" style={{ color: '#3F342D66' }}>4つの才能領域のバランス</p>
      <svg viewBox="0 0 240 228" style={{ width: '100%', maxWidth: '240px', display: 'block', margin: '0 auto' }}>
        {[0.25, 0.5, 0.75, 1].map(ratio => (
          <path key={ratio} d={toPath(Array.from({ length: n }, (_, i) => axPt(ratio, i)))}
            fill="none" stroke="#E8DFD8" strokeWidth="0.75" />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const [x2, y2] = axPt(1, i)
          return <line key={i} x1={cx} y1={cy} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="#E8DFD8" strokeWidth="0.75" />
        })}
        <path d={dataPath} fill="#FAA66B22" stroke="#FAA66B" strokeWidth="2" strokeLinejoin="round" />
        {domainScores.map((d, i) => {
          const a = (i * 2 * Math.PI / n) - Math.PI / 2
          const lx = cx + (maxR + 20) * Math.cos(a)
          const ly = cy + (maxR + 20) * Math.sin(a)
          const anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle'
          const baseline = Math.sin(a) < -0.3 ? 'auto' : Math.sin(a) > 0.3 ? 'hanging' : 'middle'
          return (
            <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)} fontSize="10"
              textAnchor={anchor} dominantBaseline={baseline} style={{ fill: DOMAIN_COLORS[d.domain] ?? '#3F342D99' }}>
              {d.domain}
            </text>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-1.5 justify-center mt-2">
        {domainScores.map((d, i) => (
          <span key={i} className="text-xs px-2.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: (DOMAIN_COLORS[d.domain] ?? '#FAA66B') + '18', color: DOMAIN_COLORS[d.domain] ?? '#FAA66B' }}>
            {d.domain}：{d.pct}%
          </span>
        ))}
      </div>
    </div>
  )
}

function TalentRankingBars({ allRanking }: { allRanking: { talent: string; domain: string; score: number }[] }) {
  const maxScore = allRanking[0]?.score ?? 1
  const byDomain: Record<string, { talent: string; score: number }[]> = {}
  for (const t of allRanking) {
    if (!byDomain[t.domain]) byDomain[t.domain] = []
    byDomain[t.domain].push({ talent: t.talent, score: t.score })
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-sm font-bold mb-0.5" style={{ color: '#FAA66B' }}>才能20位フルランキング</h2>
      <p className="text-xs mb-4" style={{ color: '#3F342D66' }}>60問から算出した全才能スコア</p>
      <div className="space-y-4">
        {Object.entries(byDomain).map(([domain, talents]) => (
          <div key={domain}>
            <p className="text-xs font-bold mb-2" style={{ color: DOMAIN_COLORS[domain] ?? '#FAA66B' }}>{domain}</p>
            <div className="space-y-1.5">
              {talents.sort((a, b) => b.score - a.score).map((t, i) => {
                const pct = Math.round((t.score / maxScore) * 100)
                const rank = allRanking.findIndex(r => r.talent === t.talent) + 1
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs w-4 shrink-0 text-right" style={{ color: rank <= 5 ? '#FAA66B' : '#3F342D44' }}>{rank}</span>
                    <span className="text-xs w-20 shrink-0" style={{ color: rank <= 5 ? '#3F342D' : '#3F342D99' }}>{t.talent}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#F0EAE5' }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: rank <= 5 ? (DOMAIN_COLORS[domain] ?? '#FAA66B') : '#D4C8C0' }} />
                    </div>
                    <span className="text-xs w-6 text-right shrink-0" style={{ color: '#3F342D66' }}>{t.score}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoadmapFlow({ actions }: { actions: { period: string; action: string }[] }) {
  const colors = ['#FAA66B', '#F09060', '#E07050', '#D06040', '#C05030', '#B04020']
  return (
    <div className="space-y-1">
      {actions.map((item, i) => (
        <div key={i}>
          <div className="flex gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#FAFAFA' }}>
            <span className="text-xs font-bold shrink-0 w-16" style={{ color: colors[i] ?? '#FAA66B' }}>{item.period}</span>
            <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{item.action}</p>
          </div>
          {i < actions.length - 1 && (
            <div className="ml-6 w-0.5 h-2 my-0.5 mx-auto rounded-full" style={{ backgroundColor: (colors[i] ?? '#FAA66B') + '40', maxWidth: '2px' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function HighTicketResultStream({ diagnosisId, initialData, talentData }: Props) {
  const [fields, setFields] = useState<Partial<ContentFields>>(initialData ?? {})
  const [streaming, setStreaming] = useState(!initialData?.letter || !initialData?.hardship_core || !initialData?.inner_child)
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
      const es = new EventSource(`/api/diagnosis/high-ticket/stream?diagnosisId=${encodeURIComponent(diagnosisId)}`)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as { done?: boolean; error?: string; field?: string; value?: unknown }
          if (data.done) {
            setStreaming(false)
            es.close()
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
    : !fields.summary ? 'summary'
    : !fields.strengths ? 'strengths'
    : !fields.core_insight ? 'core_insight'
    : !fields.hardship_core ? 'hardship_core'
    : !fields.communication_style ? 'communication_style'
    : !fields.talent_shadow ? 'talent_shadow'
    : !fields.relationship_blueprint ? 'relationship_blueprint'
    : !fields.energy_map ? 'energy_map'
    : !fields.spiritual ? 'spiritual'
    : !fields.roadmap ? 'roadmap'
    : !fields.selfcare ? 'selfcare'
    : !fields.inner_child ? 'inner_child'
    : !fields.letter ? 'letter'
    : null

  return (
    <div ref={topRef} className="space-y-4">

      {/* ビジュアル：才能ドメインレーダー */}
      {talentData && <DomainRadarChart domainScores={talentData.domainScores} />}

      {/* ビジュアル：才能20位フルランキング */}
      {talentData && <TalentRankingBars allRanking={talentData.allRanking} />}

      {/* 1. 総合自己分析レポート */}
      {fields.summary ? (
        <div id="ht-summary" className="rounded-2xl p-5 shadow-sm bg-white section-reveal">
          <h2 className="text-sm font-bold mb-1" style={{ color: '#FAA66B' }}>総合自己分析レポート</h2>
          <p className="text-sm font-bold mb-3 leading-snug" style={{ color: '#3F342D' }}>{fields.summary.title}</p>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#3F342D' }}>{fields.summary.body}</p>
        </div>
      ) : <Skeleton generating={generatingSection === 'summary'} />}

      {/* 2. 才能トップ5 */}
      {fields.strengths ? (
        <div id="ht-talents" className="rounded-2xl p-5 shadow-sm bg-white section-reveal">
          <h2 className="text-sm font-bold mb-4" style={{ color: '#FAA66B' }}>才能トップ5</h2>
          <div className="space-y-4 mb-5">
            {fields.strengths.top5?.map((t, i) => (
              <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#FFF2E8' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: '#FAA66B' }}>{t.rank}</span>
                  <div>
                    <span className="text-sm font-bold" style={{ color: '#3F342D' }}>{t.name}</span>
                    <span className="text-xs ml-2 px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: (DOMAIN_COLORS[t.domain] ?? '#FAA66B') + '18', color: DOMAIN_COLORS[t.domain] ?? '#FAA66B' }}>
                      {t.domain}
                    </span>
                  </div>
                </div>
                <p className="text-xs font-medium mb-2" style={{ color: '#FAA66B' }}>「{t.tagline}」</p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: '#3F342D99' }}>{t.description}</p>
                <div className="space-y-2 mb-3">
                  {[
                    { label: '活きる場面', text: t.shines_when, color: '#6BB5A0' },
                    { label: '注意ポイント', text: t.watch_out, color: '#F0877A' },
                    { label: '向いている方向', text: t.career_hint, color: '#9B8DD4' },
                  ].map(item => (
                    <div key={item.label} className="flex gap-2">
                      <span className="text-xs font-medium shrink-0 w-20" style={{ color: item.color }}>{item.label}</span>
                      <span className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
                {t.tip && (
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: '#fff', border: '1px solid #FAA66B22' }}>
                    <span className="text-xs shrink-0">💡</span>
                    <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{t.tip}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {fields.strengths.synergy_note && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF8F2' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>才能の組み合わせが生む強み</p>
                <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.strengths.synergy_note}</p>
              </div>
            )}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAFAFA' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#3F342D66' }}>才能のバランスから見た全体像</p>
              <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.strengths.domain_summary}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FAFAFA' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#3F342D66' }}>人間関係でのパターン</p>
              <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.strengths.relationship_pattern}</p>
            </div>
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'strengths'} />}

      {/* 3. 才能×深層心理の核心 */}
      {fields.core_insight ? (
        <div className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#F5F0FA' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔬</span>
            <h2 className="text-sm font-bold" style={{ color: '#8B8DD4' }}>才能×深層心理の核心</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl p-4 bg-white">
              <p className="text-xs font-bold mb-2" style={{ color: '#8B8DD4' }}>このひとの本質の核</p>
              <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{fields.core_insight.essence}</p>
            </div>
            <div className="rounded-xl p-4 bg-white">
              <p className="text-xs font-bold mb-2" style={{ color: '#6BB5A0' }}>力が発揮される条件（ゾーン）</p>
              <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.core_insight.unlock}</p>
            </div>
            <div className="rounded-xl p-4 bg-white">
              <p className="text-xs font-bold mb-2" style={{ color: '#F0877A' }}>まだ気づいていない自分の側面</p>
              <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.core_insight.blindspot}</p>
            </div>
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'core_insight'} />}

      {/* 4. 生きづらさの根幹 */}
      {fields.hardship_core ? (
        <div className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#EEF0FA' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🌊</span>
            <h2 className="text-sm font-bold" style={{ color: '#6B6FC4' }}>生きづらさの根幹</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: '#3F342D66' }}>心の深い場所に流れるパターンに気づくことが、自分を楽にする第一歩です。</p>
          <div className="space-y-3">
            <div className="rounded-xl p-4 bg-white">
              <p className="text-xs font-bold mb-2" style={{ color: '#6B6FC4' }}>あなたの心のパターン</p>
              <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{fields.hardship_core.root_pattern}</p>
            </div>
            <div className="rounded-xl p-4 bg-white">
              <p className="text-xs font-bold mb-2" style={{ color: '#8B8DD4' }}>そのパターンはどこから来たのか</p>
              <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.hardship_core.defense_origin}</p>
            </div>
            <div className="rounded-xl p-4 bg-white">
              <p className="text-xs font-bold mb-2" style={{ color: '#FAA66B' }}>美しい強みと、それが苦しさに変わるとき</p>
              <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.hardship_core.strength_shadow}</p>
            </div>
            <div className="rounded-xl p-4 bg-white">
              <p className="text-xs font-bold mb-3" style={{ color: '#6BB5A0' }}>認知をやわらげる、日々のヒント</p>
              <div className="space-y-2">
                {fields.hardship_core.reframe_hints?.map((hint, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: '#6B6FC4', fontSize: '10px' }}>{i + 1}</span>
                    <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{hint}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: '#6B6FC418' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#6B6FC4' }}>毎日ひとつだけ、意識してほしいこと</p>
              <p className="text-sm leading-relaxed font-medium" style={{ color: '#3F342D' }}>{fields.hardship_core.daily_awareness}</p>
            </div>
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'hardship_core'} />}

      {/* 5. コミュニケーション取扱説明書 */}
      {fields.communication_style ? (
        <div className="rounded-2xl p-5 shadow-sm bg-white section-reveal">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">💬</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>コミュニケーション取扱説明書</h2>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.communication_style.description}</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-xl p-3" style={{ backgroundColor: '#EEF7F4' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#6BB5A0' }}>コミュニケーションの強み</p>
              <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.communication_style.strengths}</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: '#FFF8F2' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#F0877A' }}>注意すべき癖</p>
              <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.communication_style.cautions}</p>
            </div>
          </div>
          {fields.communication_style.best_roles?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold mb-2" style={{ color: '#3F342D66' }}>輝くチームでの役割</p>
              <div className="flex flex-wrap gap-1.5">
                {fields.communication_style.best_roles.map((role, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: '#FAA66B18', color: '#FAA66B' }}>{role}</span>
                ))}
              </div>
            </div>
          )}
          {fields.communication_style.tips?.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: '#3F342D66' }}>すぐ使える実践ヒント</p>
              <div className="space-y-1.5">
                {fields.communication_style.tips.map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs shrink-0" style={{ color: '#FAA66B' }}>✦</span>
                    <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : <Skeleton generating={generatingSection === 'communication_style'} />}

      {/* 5. 才能の光と影マップ */}
      {fields.talent_shadow ? (
        <div className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FFF8F2' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">☯️</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>才能の光と影マップ</h2>
          </div>
          <p className="text-xs mb-3" style={{ color: '#3F342D66' }}>強みはしんどさの裏返し。パターンに気づくことが切り替えの第一歩です。</p>
          <div className="space-y-3">
            {fields.talent_shadow.map((item, i) => (
              <div key={i} className="rounded-xl p-4 bg-white">
                <p className="text-xs font-bold mb-2" style={{ color: '#FAA66B' }}>{item.talent}</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6BB5A0' }}>✨ 光</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.light}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#F0877A' }}>🌑 影</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.shadow}</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 pt-2" style={{ borderTop: '1px solid #F0EAE5' }}>
                  <span className="text-xs shrink-0">💡</span>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{item.switch}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'talent_shadow'} />}

      {/* 6. 人間関係の設計図 */}
      {fields.relationship_blueprint ? (
        <div className="rounded-2xl p-5 shadow-sm bg-white section-reveal">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🤝</span>
            <h2 className="text-sm font-bold" style={{ color: '#3F342D' }}>人間関係の設計図</h2>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.relationship_blueprint.overview}</p>
          {fields.relationship_blueprint.compatible_types?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold mb-2" style={{ color: '#6BB5A0' }}>安全に深く関われるタイプ</p>
              <div className="flex flex-wrap gap-1.5">
                {fields.relationship_blueprint.compatible_types.map((t, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: '#EEF7F4', color: '#6BB5A0' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#FFF8F2' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#FAA66B' }}>大切にしていい自分の境界線</p>
            <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.relationship_blueprint.boundaries}</p>
          </div>
          <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#FAFAFA' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#3F342D66' }}>このひとに合った距離感</p>
            <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.relationship_blueprint.distance_hint}</p>
          </div>
          {fields.relationship_blueprint.connection_tips?.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: '#3F342D66' }}>心地よい関係をつくるヒント</p>
              <div className="space-y-1.5">
                {fields.relationship_blueprint.connection_tips.map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs shrink-0" style={{ color: '#6BB5A0' }}>✦</span>
                    <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : <Skeleton generating={generatingSection === 'relationship_blueprint'} />}

      {/* 7. エネルギーマップ */}
      {fields.energy_map ? (
        <div className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#F0FBF8' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⚡</span>
            <h2 className="text-sm font-bold" style={{ color: '#6BB5A0' }}>エネルギーマップ</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3 bg-white">
              <p className="text-xs font-bold mb-2" style={{ color: '#6BB5A0' }}>⬆ 充電される源</p>
              <div className="space-y-1">
                {fields.energy_map.charge_sources?.map((s, i) => (
                  <div key={i} className="flex gap-1.5 items-start">
                    <span className="text-xs shrink-0" style={{ color: '#6BB5A0' }}>◉</span>
                    <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-3 bg-white">
              <p className="text-xs font-bold mb-2" style={{ color: '#F0877A' }}>⬇ 消耗するパターン</p>
              <div className="space-y-1">
                {fields.energy_map.drain_sources?.map((s, i) => (
                  <div key={i} className="flex gap-1.5 items-start">
                    <span className="text-xs shrink-0" style={{ color: '#F0877A' }}>◉</span>
                    <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 bg-white mb-3">
            <p className="text-xs font-bold mb-2" style={{ color: '#F0877A' }}>エネルギー切れのサインと対処</p>
            <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.energy_map.warning_signs}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#6BB5A018' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#6BB5A0' }}>あなたに合ったエネルギー管理の戦略</p>
            <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{fields.energy_map.rhythm_hint}</p>
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'energy_map'} />}

      {/* 8. スピリチュアル補足 */}
      {fields.spiritual ? (
        <div id="ht-spiritual" className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FFF8F2' }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: '#FAA66B' }}>スピリチュアル補足</h2>
          <div className="space-y-3">
            {[
              { label: '数秘から見たあなた', text: fields.spiritual.numerology_reading, color: '#9B8DD4' },
              { label: '星座から見たあなた', text: fields.spiritual.zodiac_reading, color: '#6BB5A0' },
              { label: '今いるステージ', text: fields.spiritual.current_stage, color: '#FAA66B' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4 bg-white">
                <p className="text-xs font-bold mb-2" style={{ color: item.color }}>{item.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.text}</p>
              </div>
            ))}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF2E8' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#FAA66B' }}>運命があなたに伝えたいこと</p>
              <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{fields.spiritual.universe_message}</p>
            </div>
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'spiritual'} />}

      {/* 9. 目標達成ロードマップ */}
      {fields.roadmap ? (
        <div id="ht-roadmap" className="rounded-2xl p-5 shadow-sm bg-white section-reveal">
          <h2 className="text-sm font-bold mb-4" style={{ color: '#FAA66B' }}>目標達成ロードマップ</h2>
          <RoadmapFlow actions={fields.roadmap.actions ?? []} />
          <p className="text-xs leading-relaxed text-center mt-4 px-2" style={{ color: '#3F342D99' }}>
            「{fields.roadmap.encouragement}」
          </p>
        </div>
      ) : <Skeleton generating={generatingSection === 'roadmap'} />}

      {/* 10. 自分大切シート */}
      {fields.selfcare ? (
        <div id="ht-selfcare" className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FFF2E8' }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: '#FAA66B' }}>自分大切シート</h2>
          <RoadmapFlow actions={fields.selfcare.selfcare_actions ?? []} />
          <div className="rounded-xl p-4 mt-4 bg-white">
            <p className="text-xs font-bold mb-2" style={{ color: '#FAA66B' }}>強みを活かした自分の取扱説明書</p>
            <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{fields.selfcare.manual}</p>
          </div>
          <div className="rounded-xl p-4 mt-3 bg-white">
            <p className="text-xs font-bold mb-2" style={{ color: '#FAA66B' }}>疲れたときの回復アクション</p>
            <div className="space-y-1">
              {fields.selfcare.recovery_actions?.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-xs" style={{ color: '#FAA66B' }}>✦</span>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-4 mt-3 bg-white">
            <p className="text-xs font-bold mb-2" style={{ color: '#FAA66B' }}>大切にしていい自分のルール</p>
            <div className="space-y-1">
              {fields.selfcare.my_rules?.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-xs" style={{ color: '#FAA66B' }}>◆</span>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{r}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'selfcare'} />}

      {/* 11. インナーチャイルドへのメッセージ */}
      {fields.inner_child ? (
        <div className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FDF0F8' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🌸</span>
            <h2 className="text-sm font-bold" style={{ color: '#C47AB0' }}>インナーチャイルドへのメッセージ</h2>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#3F342D' }}>{fields.inner_child}</p>
        </div>
      ) : <Skeleton generating={generatingSection === 'inner_child'} />}

      {/* 12. ぽとりからの手紙 */}
      {fields.letter ? (
        <div className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FFF2E8' }}>
          <div className="flex justify-center mb-3">
            <Image src="/potori/comforting.png" alt="ぽとり" width={80} height={80} className="object-contain" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xl">💌</span>
            <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>ぽとりからの手紙</h2>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#3F342D' }}>
            {fields.letter.replace(/^.{1,20}さんへ[\r\n]+/, '')}
          </p>
        </div>
      ) : <Skeleton generating={generatingSection === 'letter'} />}
    </div>
  )
}
