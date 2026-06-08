'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface LabeledItem { title: string; body: string }
interface SimpleItem { title: string; description: string }

interface ContentFields {
  overview_para1: string
  overview_para2: string
  aru_aru: string[]
  strengths_overview: string
  strengths: LabeledItem[]
  painful_pattern_overview: string
  painful_pattern: LabeledItem[]
  energizing: string
  energizing_items: SimpleItem[]
  draining: string
  draining_items: SimpleItem[]
  message: string
}

interface Metadata {
  axis1Name: string
  axis2Name: string
  axis1Pct: { A: number; B: number; C: number; D: number }
  axis2Pct: { '1': number; '2': number; '3': number; '4': number }
}

interface Props {
  diagnosisId: string
  metadata: Metadata
  initialData?: Partial<ContentFields>
  showOtherCta?: boolean
}

function ScoreBar({ label, pct, dominant }: { label: string; pct: number; dominant: boolean }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium" style={{ color: dominant ? '#FAA66B' : '#3F342D99' }}>{label}</span>
        <span className="text-xs" style={{ color: dominant ? '#FAA66B' : '#3F342D66' }}>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#F0EAE5' }}>
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: dominant ? '#FAA66B' : '#D4C8C0' }} />
      </div>
    </div>
  )
}

function Skeleton({ generating }: { generating?: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {generating && (
        <div className="flex items-center gap-1.5 mb-4">
          {[0, 150, 300].map(d => (
            <span
              key={d}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }}
            />
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

export default function FreeResultStream({ diagnosisId, metadata, initialData, showOtherCta }: Props) {
  const [fields, setFields] = useState<Partial<ContentFields>>(initialData ?? {})
  const [streaming, setStreaming] = useState(!initialData?.message)
  const retries = useRef(0)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (initialData?.message) return

    function connect() {
      const es = new EventSource(`/api/diagnosis/free/stream?diagnosisId=${encodeURIComponent(diagnosisId)}`)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as { done?: boolean; error?: string; field?: string; value?: unknown }
          if (data.done) {
            setStreaming(false)
            es.close()
          } else if (data.error) {
            es.close()
            if (retries.current < 2) {
              retries.current += 1
              setTimeout(connect, 2000)
            } else {
              setStreaming(false)
            }
          } else if (data.field) {
            setFields(prev => ({ ...prev, [data.field!]: data.value }))
          }
        } catch {}
      }

      es.onerror = () => {
        es.close()
        if (retries.current < 2) {
          retries.current += 1
          setTimeout(connect, 2000)
        } else {
          setStreaming(false)
        }
      }
    }

    connect()
    return () => { esRef.current?.close() }
  }, [diagnosisId, initialData])

  // Which section is currently being generated (first without data)
  const generatingSection = !streaming ? null
    : !fields.overview_para1 ? 'overview'
    : !fields.aru_aru ? 'aru_aru'
    : !fields.strengths_overview ? 'strengths_overview'
    : !fields.strengths ? 'strengths'
    : !fields.painful_pattern_overview ? 'painful_pattern_overview'
    : !fields.painful_pattern ? 'painful_pattern'
    : !fields.energizing ? 'energizing'
    : !fields.draining ? 'draining'
    : !fields.message ? 'message'
    : null

  const { axis1Name, axis2Name, axis1Pct, axis2Pct } = metadata

  const axis1Items = [
    { label: '共感性',   pct: axis1Pct.A, dominant: axis1Name === '共感性' },
    { label: '誠実さ',   pct: axis1Pct.B, dominant: axis1Name === '誠実さ' },
    { label: '感受性',   pct: axis1Pct.C, dominant: axis1Name === '感受性' },
    { label: '思慮深さ', pct: axis1Pct.D, dominant: axis1Name === '思慮深さ' },
  ]
  const axis2Items = [
    { label: '思いやり', pct: axis2Pct['1'], dominant: axis2Name === '思いやり' },
    { label: '向上心',   pct: axis2Pct['2'], dominant: axis2Name === '向上心' },
    { label: '繊細さ',   pct: axis2Pct['3'], dominant: axis2Name === '繊細さ' },
    { label: '洞察力',   pct: axis2Pct['4'], dominant: axis2Name === '洞察力' },
  ]

  return (
    <>
      {/* 1. タイプ概要 */}
      {fields.overview_para1 ? (
        <div id="overview" className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#FAA66B' }}>あなたのこと</h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#3F342D' }}>{fields.overview_para1}</p>
          {fields.overview_para2 && (
            <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{fields.overview_para2}</p>
          )}
        </div>
      ) : <Skeleton generating={generatingSection === 'overview'} />}

      {/* 2. 性格スコアバー — メタデータから即表示 */}
      <div id="traits" className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
        <h2 className="text-sm font-bold mb-4" style={{ color: '#FAA66B' }}>あなたの特性</h2>
        <p className="text-xs mb-3" style={{ color: '#3F342D66' }}>基本特性</p>
        <div className="space-y-3 mb-5">{axis1Items.map(item => <ScoreBar key={item.label} {...item} />)}</div>
        <p className="text-xs mb-3" style={{ color: '#3F342D66' }}>補助特性</p>
        <div className="space-y-3">{axis2Items.map(item => <ScoreBar key={item.label} {...item} />)}</div>
      </div>

      {/* 3. あるある */}
      {fields.aru_aru ? (
        <div id="arubaru" className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <h2 className="text-sm font-bold mb-4" style={{ color: '#FAA66B' }}>こんなこと、ありませんか？</h2>
          <div className="space-y-2">
            {fields.aru_aru.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF2E8' }}>
                <span className="text-xs mt-0.5 shrink-0" style={{ color: '#FAA66B' }}>✓</span>
                <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'aru_aru'} />}

      {/* 他者診断CTA */}
      {showOtherCta && (
        <a
          href={`/diagnosis/other?diagnosisId=${diagnosisId}`}
          className="block rounded-2xl p-5 text-center"
          style={{ backgroundColor: '#FFF2E8', textDecoration: 'none', border: '1px solid #FAA66B33' }}
        >
          <p className="text-sm font-bold mb-2" style={{ color: '#FAA66B' }}>相手から見た自分の強みや性格を知ってみませんか？</p>
          <p className="text-xs font-medium mb-3" style={{ color: '#3F342D' }}>
            【無料で簡単】リンクを送るだけで診断できます！
          </p>
          <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
            仲の良い友達や家族に診断してもらい、1人以上の回答で「開放」「盲点」「秘密」「未知」ジョハリの4つの窓が解放されます。自分の診断結果と相手からの診断結果をグラフで可視化！3人以上の回答でさらに詳細なレポートが作られ、気づいていない自分を知ることができます。
          </p>
          <span className="inline-block px-5 py-2.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FAA66B', color: '#fff' }}>
            無料で他者診断を依頼する →
          </span>
        </a>
      )}

      {/* 4. 強み */}
      {fields.strengths ? (
        <div id="strengths" className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#FAA66B' }}>あなたの強み</h2>
          {fields.strengths_overview && (
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.strengths_overview}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {fields.strengths.map((item, i) => (
              <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#FAFAFA' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span style={{ color: '#FAA66B' }}>✦</span>
                  <p className="text-xs font-bold leading-snug" style={{ color: '#3F342D' }}>{item.title}</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'strengths_overview' || generatingSection === 'strengths'} />}

      {/* 5. しんどくなるパターン */}
      {fields.painful_pattern ? (
        <div id="painful" className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#FAA66B' }}>あなたを苦しめるパターン</h2>
          {fields.painful_pattern_overview ? (
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.painful_pattern_overview}</p>
          ) : (
            <p className="text-xs mb-4" style={{ color: '#3F342D66' }}>これはあなたの弱さではなく、あなたの特性から来るものです</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {fields.painful_pattern.map((item, i) => (
              <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#F5F0EC' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span style={{ color: '#3F342D66' }}>◆</span>
                  <p className="text-xs font-bold leading-snug" style={{ color: '#3F342D' }}>{item.title}</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : <Skeleton generating={generatingSection === 'painful_pattern_overview' || generatingSection === 'painful_pattern'} />}

      {/* 6. 元気になるもの */}
      {fields.energizing ? (
        <div id="energizing" className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FFF8F2' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#FAA66B' }}>元気になるもの</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.energizing}</p>
          {fields.energizing_items && fields.energizing_items.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {fields.energizing_items.map((item, i) => (
                <div key={i} className="rounded-xl p-3 bg-white">
                  <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : <Skeleton generating={generatingSection === 'energizing'} />}

      {/* 7. 疲れさせるもの */}
      {fields.draining ? (
        <div id="draining" className="bg-white rounded-2xl p-5 shadow-sm section-reveal">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#FAA66B' }}>疲れさせるもの</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{fields.draining}</p>
          {fields.draining_items && fields.draining_items.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {fields.draining_items.map((item, i) => (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#F5F0EC' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#3F342D99' }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : <Skeleton generating={generatingSection === 'draining'} />}

      {/* 8. ぽとりからのメッセージ */}
      {fields.message ? (
        <div id="message" className="rounded-2xl p-5 shadow-sm section-reveal" style={{ backgroundColor: '#FFF2E8' }}>
          <div className="flex justify-center mb-3">
            <Image src="/potori/comforting.png" alt="ぽとり" width={80} height={80} className="object-contain" />
          </div>
          <h2 className="text-sm font-bold mb-3 text-center" style={{ color: '#FAA66B' }}>ぽとりからのメッセージ</h2>
          <p className="text-sm leading-relaxed text-center" style={{ color: '#3F342D' }}>「{fields.message}」</p>
        </div>
      ) : <Skeleton generating={generatingSection === 'message'} />}
    </>
  )
}
