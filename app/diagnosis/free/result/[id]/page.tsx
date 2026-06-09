import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateType, PERSONALITY_TYPES, type PersonalityType } from '@/lib/diagnosis/types'
import ShareButtons from '@/app/components/ShareButtons'
import LockedSection from '@/app/components/LockedSection'
import AnchorNav from '@/app/components/AnchorNav'
import PaidResultStream from '@/app/components/PaidResultStream'
import OtherMultiPoller from '@/app/components/OtherMultiPoller'
import OtherSinglePoller from '@/app/components/OtherSinglePoller'
import PaidOtherPoller from '@/app/components/PaidOtherPoller'
import HighTicketResultStream from '@/app/components/HighTicketResultStream'
import FreeResultStream from '@/app/components/FreeResultStream'
import JibunnNoteClient, { type Note } from '@/app/counseling/jibunn-note/client'
import { createClient } from '@/lib/supabase/server'
import { resolveNoteLimit } from '@/lib/resolve-note-limit'
import { calculateSectionScores } from '@/lib/diagnosis/paid-questions'
import { calculateStrengthScores, calculateDomainScores } from '@/lib/diagnosis/high-ticket-questions'
import type { TalentData, ContentFields } from '@/app/components/HighTicketResultStream'


interface SimpleItem { title: string; description: string }

interface ReportContent {
  typeCode: string; typeName: string; tagline: string
  axis1Name: string; axis2Name: string
  axis1Pct: { A: number; B: number; C: number; D: number }
  axis2Pct: { '1': number; '2': number; '3': number; '4': number }
  overview_para1?: string; overview_para2?: string
  aru_aru?: string[]
  strengths?: { title: string; body: string }[]
  painful_pattern?: { title: string; body: string }[]
  energizing?: string
  energizing_items?: SimpleItem[]
  draining?: string
  draining_items?: SimpleItem[]
  message?: string
}

interface PaidReportContent {
  hardship_root?: string
  hardship_root_steps?: string[]
  hardship_root_tip?: string
  core_pattern?: string
  reaction_flow?: string[]
  core_pattern_tip?: string
  relationship_pattern?: string
  relationship_steps?: string[]
  relationship_tip?: string
  boundary_setting?: string
  boundary_steps?: string[]
  boundary_tip?: string
  ease_life?: string
  ease_hints?: SimpleItem[]
  recovery_hint?: string
  recovery_hint_items?: SimpleItem[]
  ideal_work?: string
  ideal_work_jobs?: SimpleItem[]
  growth_hint?: string
  growth_hint_items?: SimpleItem[]
  letter?: string
}

interface PaidOtherSingleContent {
  other_deep_pattern: string
  hidden_strength: string
}

interface PaidOtherMultiContent {
  collective_root: string
  growth_potential: string
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: report } = await supabase.from('reports').select('content').eq('diagnosis_id', id).eq('type', 'free').maybeSingle()
  const c = report?.content as { typeName?: string; tagline?: string } | null
  if (c?.typeName) {
    return {
      title: `「${c.typeName}」の診断結果 | CocoHare`,
      description: c.tagline ?? 'こころ晴れる毎日を',
      openGraph: { title: `私は「${c.typeName}」でした | CocoHare`, description: c.tagline ?? 'こころ晴れる毎日を' },
    }
  }
  const { data: diag } = await supabase.from('diagnoses').select('answers').eq('id', id).maybeSingle()
  if (diag?.answers) {
    const { typeDef } = calculateType(diag.answers)
    return {
      title: `「${typeDef.name}」の診断結果 | CocoHare`,
      description: typeDef.tagline,
      openGraph: { title: `私は「${typeDef.name}」でした | CocoHare`, description: typeDef.tagline },
    }
  }
  return {
    title: '性格タイプ診断 | CocoHare',
    description: 'こころ晴れる毎日を',
    openGraph: { title: '性格タイプ診断 | CocoHare', description: 'こころ晴れる毎日を' },
  }
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  // Fetch diagnosis for metadata (always available)
  const { data: diagRow } = await supabase.from('diagnoses').select('answers, user_id').eq('id', id).maybeSingle()
  if (!diagRow) return notFound()

  const { axis1Scores, axis2Scores, typeDef } = calculateType(diagRow.answers)
  const axis1Pct = {
    A: Math.round(50 + (axis1Scores.A / 12) * 50),
    B: Math.round(50 + (axis1Scores.B / 12) * 50),
    C: Math.round(50 + (axis1Scores.C / 12) * 50),
    D: Math.round(50 + (axis1Scores.D / 12) * 50),
  }
  const axis2Pct = {
    '1': Math.round(50 + (axis2Scores['1'] / 8) * 50),
    '2': Math.round(50 + (axis2Scores['2'] / 8) * 50),
    '3': Math.round(50 + (axis2Scores['3'] / 8) * 50),
    '4': Math.round(50 + (axis2Scores['4'] / 8) * 50),
  }
  // グラフ用（無料診断と同じ50〜100%スケール）
  const selfBarPct = {
    A: axis1Pct.A, B: axis1Pct.B, C: axis1Pct.C, D: axis1Pct.D,
    '1': axis2Pct['1'], '2': axis2Pct['2'], '3': axis2Pct['3'], '4': axis2Pct['4'],
  }
  const metadata = {
    axis1Name: typeDef.axis1Name,
    axis2Name: typeDef.axis2Name,
    axis1Pct,
    axis2Pct,
  }

  // Fetch existing report (may have all fields for returning visitors, or old format)
  const [{ data: freeReport }, { data: free2Report }] = await Promise.all([
    supabase.from('reports').select('content').eq('diagnosis_id', id).eq('type', 'free').maybeSingle(),
    supabase.from('reports').select('content').eq('diagnosis_id', id).eq('type', 'free_2').maybeSingle(),
  ])

  // Merge free + free_2 for backward compat; treat as initialData only if complete (has 'strengths')
  const merged = {
    ...(freeReport?.content as Partial<ReportContent> ?? {}),
    ...(free2Report?.content as Partial<ReportContent> ?? {}),
  } as Partial<ReportContent>
  const initialData = merged.strengths ? merged : undefined

  const c = merged as ReportContent

  // 他者視点データ取得
  const { data: allLinks } = await supabase.from('other_perspective_links').select('id').eq('diagnosis_id', id)
  const linkIds = allLinks?.map(l => l.id) ?? []
  let answerCount = 0
  let latestComparison: { observerTypeCode: string; open_window: string; blind_window: string; hidden_window?: string; unknown_window?: string } | null = null
  let obsBarPct: { A: number; B: number; C: number; D: number; '1': number; '2': number; '3': number; '4': number } | null = null

  if (linkIds.length > 0) {
    const { data: allAnswers } = await supabase
      .from('other_perspective_answers')
      .select('observer_type_code, comparison, answers')
      .in('link_id', linkIds)
      .order('created_at', { ascending: false })
    answerCount = allAnswers?.length ?? 0
    const latest = allAnswers?.[0]
    if (latest?.comparison) {
      const comp = latest.comparison as { open_window: string; blind_window: string; hidden_window?: string; unknown_window?: string }
      latestComparison = {
        observerTypeCode: latest.observer_type_code,
        open_window: comp.open_window,
        blind_window: comp.blind_window,
        hidden_window: comp.hidden_window,
        unknown_window: comp.unknown_window,
      }
    }
    if (Array.isArray(latest?.answers)) {
      const { axis1Scores: oa1, axis2Scores: oa2 } = calculateType(latest.answers as string[])
      obsBarPct = {
        A: Math.round(50 + (oa1.A / 12) * 50),
        B: Math.round(50 + (oa1.B / 12) * 50),
        C: Math.round(50 + (oa1.C / 12) * 50),
        D: Math.round(50 + (oa1.D / 12) * 50),
        '1': Math.round(50 + (oa2['1'] / 8) * 50),
        '2': Math.round(50 + (oa2['2'] / 8) * 50),
        '3': Math.round(50 + (oa2['3'] / 8) * 50),
        '4': Math.round(50 + (oa2['4'] / 8) * 50),
      }
    }
  }

  // マルチ他者レポート取得
  type MultiReport = {
    // new fields
    gift_phrase?: string
    gift_description?: string
    consensus_tags?: string[]
    divergent_note?: string
    johari_open?: string
    johari_blind?: string
    johari_hidden?: string
    johari_unknown?: string
    // legacy fields
    consensus_strength?: string
    collective_blind?: string
    diversity_note?: string
  }
  let multiReport: MultiReport | null = null
  if (answerCount >= 3) {
    const { data: multi } = await supabase.from('reports').select('content').eq('diagnosis_id', id).eq('type', 'other_multi').maybeSingle()
    if (multi?.content) multiReport = multi.content as MultiReport
  }

  // 有料レポート取得
  const { data: paidRow } = await supabase
    .from('reports').select('content').eq('diagnosis_id', id).eq('type', 'paid').maybeSingle()
  const paidReport: PaidReportContent | null = paidRow?.content
    ? (paidRow.content as PaidReportContent)
    : null

  const hasPaid = paidReport !== null

  // 完全版診断データ取得（この無料診断に紐づいた購入のみ表示）
  const { data: htAnswersData } = await supabase
    .from('high_ticket_answers')
    .select('diagnosis_id')
    .eq('source_free_diagnosis_id', id)
    .maybeSingle()

  const htDiagnosisId = htAnswersData?.diagnosis_id ?? null
  let htGenerating = false
  let htInitialData: Partial<ContentFields> | undefined
  let talentData: TalentData | null = null

  if (htDiagnosisId) {
    const [{ data: htReportRow }, { data: htStrengthRow }] = await Promise.all([
      supabase.from('reports').select('content').eq('diagnosis_id', htDiagnosisId).eq('type', 'high_ticket').maybeSingle(),
      supabase.from('high_ticket_answers').select('strength_answers').eq('diagnosis_id', htDiagnosisId).maybeSingle(),
    ])
    htInitialData = htReportRow?.content ? (htReportRow.content as Partial<ContentFields>) : undefined
    htGenerating = !htReportRow?.content
    if (htStrengthRow?.strength_answers) {
      const sa = htStrengthRow.strength_answers as number[]
      talentData = {
        domainScores: calculateDomainScores(sa),
        allRanking: calculateStrengthScores(sa),
      }
    }
  }

  const hasHighTicket = htDiagnosisId !== null

  // 高額診断：購入済みだが回答未完了（途中離脱）の検出
  // 有料診断と同じパターン：payments.diagnosis_id = FREE_ID AND product = 'high_ticket'
  let htPendingSessionId: string | null = null
  if (!htDiagnosisId) {
    const { data: htPendingPayment } = await supabase
      .from('payments')
      .select('stripe_session_id')
      .eq('diagnosis_id', id)
      .eq('status', 'completed')
      .eq('product', 'high_ticket')
      .maybeSingle()
    htPendingSessionId = htPendingPayment?.stripe_session_id ?? null
  }

  let noteData: { initialNotes: Note[]; initialLimit: number; initialUseMonthlyReset: boolean; initialNoteCredits: number } | null = null
  if (htDiagnosisId) {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (user) {
      const { data: htDiagRow } = await supabase
        .from('diagnoses')
        .select('user_id')
        .eq('id', htDiagnosisId)
        .maybeSingle()
      if (htDiagRow?.user_id === user.id) {
        const { data: notesData } = await supabase
          .from('jibunn_notes')
          .select('id, type, input_concern, content, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        const { limit, useMonthlyReset } = resolveNoteLimit(
          user.user_metadata as Record<string, unknown>,
          true,
        )
        noteData = {
          initialNotes: (notesData ?? []) as Note[],
          initialLimit: limit,
          initialUseMonthlyReset: useMonthlyReset,
          initialNoteCredits: (user.user_metadata as Record<string, unknown>)?.note_credits as number ?? 0,
        }
      }
    }
  }

  // 有料回答済みだがレポート未生成（生成中）
  const { data: paidAnswersRow } = await supabase
    .from('paid_diagnosis_answers').select('answers').eq('diagnosis_id', id).maybeSingle()
  const isPaidGenerating = !!paidAnswersRow && !hasPaid
  type SectionScores = { section3: number; section4: number; section5: number; section6: number; section7: number }
  const sectionScores: SectionScores | null = paidAnswersRow?.answers
    ? calculateSectionScores(paidAnswersRow.answers as number[]) as SectionScores
    : null

  // 決済済みだが未回答（フォームに戻れる状態）
  const { data: paidPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('diagnosis_id', id)
    .eq('status', 'completed')
    .is('product', null)
    .maybeSingle()
  const hasPaidPayment = !!paidPayment

  // 有料×他者視点レポート取得
  let paidOtherSingle: PaidOtherSingleContent | null = null
  let paidOtherMulti: PaidOtherMultiContent | null = null
  if (hasPaid && answerCount >= 1) {
    const { data: pos } = await supabase.from('reports').select('content').eq('diagnosis_id', id).eq('type', 'paid_other_single').maybeSingle()
    if (pos?.content) paidOtherSingle = pos.content as PaidOtherSingleContent
  }
  if (hasPaid && answerCount >= 3) {
    const { data: pom } = await supabase.from('reports').select('content').eq('diagnosis_id', id).eq('type', 'paid_other_multi').maybeSingle()
    if (pom?.content) paidOtherMulti = pom.content as PaidOtherMultiContent
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#FFF9F5' }}>

      {/* タイプヘッダー */}
      <div className="px-4 pt-10 pb-8 text-center">
        <div className="flex justify-center mb-4">
          <Image src="/potori/happy.webp" alt="ぽとり" width={110} height={110} className="object-contain" />
        </div>
        <p className="text-xs mb-1" style={{ color: '#3F342D66' }}>{typeDef.axis1Name} × {typeDef.axis2Name}</p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#3F342D' }}>{typeDef.name}</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#3F342D99' }}>{typeDef.tagline}</p>
      </div>

      {/* アンカーナビ */}
      <AnchorNav hasPaid={hasPaid} hasOther={answerCount > 0} hasOtherMulti={answerCount >= 3 && !!multiReport} hasHighTicket={hasHighTicket} />

      <div className="px-4 space-y-4 max-w-xl mx-auto">

        {/* セクション1〜8: SSEストリーミング */}
        <FreeResultStream diagnosisId={id} metadata={metadata} initialData={initialData} showOtherCta={answerCount === 0} />

        {/* ── 他者視点セクション ── */}
        <div id="other">
          {answerCount === 0 ? (
            <LockedSection unlockType="other" diagnosisId={id}>
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-sm font-bold mb-1" style={{ color: '#FAA66B' }}>他者から見たあなた</h2>
                  <p className="text-xs mb-4" style={{ color: '#3F342D66' }}>他者診断タイプ：共感性 × 思いやり</p>
                  <div className="space-y-3">
                    <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF8F2' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>開放の窓</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>あなたの誠実さと温かさは、周りの人にもはっきりと伝わっています。困っている人を放っておけない姿勢が、自然と多くの信頼を集めています。あなた自身も感じているとおり、思いやりの深さがあなたの核心にあります。</p>
                    </div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: '#F5F0EC' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#3F342D99' }}>盲点の窓</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>あなたの安定感と存在感は、思っている以上に周りの人に影響を与えているのかもしれません。しんどいときでも揺らがない姿が、知らず知らずのうちに周囲の支えになっているのかもしれません。</p>
                    </div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: '#F0F0FA' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#8B8DD4' }}>秘密の窓</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>あなたが内側で大切にしている想いや価値観は、まだ周りには十分伝わっていないかもしれません。少し打ち明けてみることで、関係がぐっと深まるかもしれません。</p>
                    </div>
                  </div>
                </div>
              </div>
            </LockedSection>
          ) : latestComparison ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold mb-1" style={{ color: '#FAA66B' }}>他者から見たあなた</h2>
              <p className="text-xs mb-4" style={{ color: '#3F342D66' }}>{answerCount}人の回答をもとに分析しました</p>
              {/* 特性比較レーダーチャート */}
              {obsBarPct && (() => {
                const n = 8, cx = 130, cy = 118, maxR = 72
                const traits = [
                  { label: '共感性',   s: selfBarPct.A,    o: obsBarPct!.A    },
                  { label: '誠実さ',   s: selfBarPct.B,    o: obsBarPct!.B    },
                  { label: '感受性',   s: selfBarPct.C,    o: obsBarPct!.C    },
                  { label: '思慮深さ', s: selfBarPct.D,    o: obsBarPct!.D    },
                  { label: '思いやり', s: selfBarPct['1'], o: obsBarPct!['1'] },
                  { label: '向上心',   s: selfBarPct['2'], o: obsBarPct!['2'] },
                  { label: '繊細さ',   s: selfBarPct['3'], o: obsBarPct!['3'] },
                  { label: '洞察力',   s: selfBarPct['4'], o: obsBarPct!['4'] },
                ]
                const pt = (val: number, i: number) => {
                  const a = (i * 2 * Math.PI / n) - Math.PI / 2
                  const r = (val / 100) * maxR  // 50%→半径50%、100%→半径100%
                  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number]
                }
                const axPt = (ratio: number, i: number) => {
                  const a = (i * 2 * Math.PI / n) - Math.PI / 2
                  return [cx + ratio * maxR * Math.cos(a), cy + ratio * maxR * Math.sin(a)] as [number, number]
                }
                const toPath = (pts: [number, number][]) =>
                  pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + 'Z'
                const selfPath = toPath(traits.map((t, i) => pt(t.s, i)))
                const obsPath  = toPath(traits.map((t, i) => pt(t.o, i)))
                return (
                  <div className="mb-4">
                    <p className="text-xs font-bold mb-1" style={{ color: '#3F342D66' }}>特性の比較</p>
                    <svg viewBox="0 0 260 248" style={{ width: '100%', maxWidth: '260px', display: 'block', margin: '0 auto' }}>
                      {[0.5, 0.75, 1].map(ratio => (
                        <path key={ratio} d={toPath(Array.from({length: n}, (_, i) => axPt(ratio, i)))}
                          fill="none" stroke="#E8DFD8" strokeWidth="0.75" />
                      ))}
                      {Array.from({length: n}, (_, i) => {
                        const [x2, y2] = axPt(1, i)
                        return <line key={i} x1={cx} y1={cy} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="#E8DFD8" strokeWidth="0.75" />
                      })}
                      <path d={obsPath}  fill="#8B8DD428" stroke="#8B8DD4" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d={selfPath} fill="#FAA66B28" stroke="#FAA66B" strokeWidth="1.5" strokeLinejoin="round" />
                      {traits.map((t, i) => {
                        const a = (i * 2 * Math.PI / n) - Math.PI / 2
                        const lx = cx + (maxR + 17) * Math.cos(a)
                        const ly = cy + (maxR + 17) * Math.sin(a)
                        const cos = Math.cos(a), sin = Math.sin(a)
                        const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
                        const baseline = sin < -0.3 ? 'auto' : sin > 0.3 ? 'hanging' : 'middle'
                        return (
                          <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)}
                            fontSize="10" textAnchor={anchor} dominantBaseline={baseline}
                            style={{ fill: '#3F342D99' }}>
                            {t.label}
                          </text>
                        )
                      })}
                    </svg>
                    <div className="flex gap-4 justify-center mt-1">
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: '#FAA66B' }}>
                        <span className="w-5 h-0.5 inline-block rounded" style={{ backgroundColor: '#FAA66B' }} />自分
                      </span>
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: '#8B8DD4' }}>
                        <span className="w-5 h-0.5 inline-block rounded" style={{ backgroundColor: '#8B8DD4' }} />他者
                      </span>
                    </div>
                  </div>
                )
              })()}
              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF8F2' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: '#FAA66B' }}>開放の窓</p>
                  <p className="text-xs mb-1" style={{ color: '#3F342D99' }}>あなたも他者も、同じように感じている特性です。</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{latestComparison.open_window}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: '#F5F0EC' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: '#3F342D99' }}>盲点の窓</p>
                  <p className="text-xs mb-1" style={{ color: '#3F342D66' }}>他者には見えているが、あなた自身は気づいていないかもしれない部分です。</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{latestComparison.blind_window}</p>
                </div>
                {latestComparison.hidden_window && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#F0F0FA' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: '#8B8DD4' }}>秘密の窓</p>
                    <p className="text-xs mb-1" style={{ color: '#3F342D66' }}>あなたは感じているが、他者にはまだ伝わっていない内面です。</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{latestComparison.hidden_window}</p>
                  </div>
                )}
                {latestComparison.unknown_window && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#EEF7F4' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: '#6BB5A0' }}>未知の窓</p>
                    <p className="text-xs mb-1" style={{ color: '#3F342D66' }}>あなた自身も他者もまだ気づいていない、潜在的な可能性です。</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{latestComparison.unknown_window}</p>
                  </div>
                )}
              </div>
              <Link href={`/diagnosis/other?diagnosisId=${id}`} className="block mt-4 text-center text-xs" style={{ color: '#FAA66B' }}>
                もっと依頼する（{answerCount}人回答済み）
              </Link>
            </div>
          ) : <OtherSinglePoller diagnosisId={id} />}
        </div>

        {/* シェア */}
        <div id="share" className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold mb-1" style={{ color: '#3F342D' }}>診断結果をシェアする</h2>
          <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>「私ってこんな人でした」を友人に教えてみましょう。</p>
          <ShareButtons typeName={c.typeName ?? typeDef.name} diagnosisId={id} />
        </div>

        {/* ── 3人以上ボーナスセクション ── */}
        <div id="other-multi">
          {answerCount >= 3 ? (
            multiReport ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-sm font-bold mb-1" style={{ color: '#FAA66B' }}>みんなから見たあなた</h2>
                  <p className="text-xs" style={{ color: '#3F342D66' }}>{answerCount}人の回答をもとに分析しました</p>
                </div>

                {/* ① あなたの社会的な贈り物 */}
                {multiReport.gift_phrase && (
                  <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #FAA66B22 0%, #F5A0C022 100%)', border: '1px solid #FAA66B33' }}>
                    <p className="text-xs mb-2" style={{ color: '#FAA66B99' }}>あなたが周囲に与えているもの</p>
                    <p className="text-xl font-bold mb-3" style={{ color: '#FAA66B' }}>〈{multiReport.gift_phrase}〉</p>
                    {multiReport.consensus_tags && (
                      <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                        {multiReport.consensus_tags.map((tag, i) => (
                          <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FAA66B1A', color: '#FAA66B' }}>{tag}</span>
                        ))}
                      </div>
                    )}
                    {multiReport.gift_description && (
                      <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{multiReport.gift_description}</p>
                    )}
                  </div>
                )}

                {/* ② 全員一致の強み */}
                {multiReport.consensus_strength && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF8F2' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>みんなが一致して感じていること</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{multiReport.consensus_strength}</p>
                  </div>
                )}

                {/* ② 隠れた魅力 */}
                {multiReport.collective_blind && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#F5F0EC' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: '#3F342D99' }}>あなたの隠れた魅力</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{multiReport.collective_blind}</p>
                  </div>
                )}

                {/* ① ズレの可視化 */}
                {(multiReport.divergent_note ?? multiReport.diversity_note) && (
                  <div className="rounded-xl p-4" style={{ border: '1px solid #E8DFD8' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: '#3F342D66' }}>見る人によって違う印象＝あなたの多面性</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{multiReport.divergent_note ?? multiReport.diversity_note}</p>
                  </div>
                )}

                {/* ③ ジョハリマップ */}
                {multiReport.johari_open && (
                  <div>
                    <p className="text-xs font-bold mb-2" style={{ color: '#3F342D66' }}>みんなの視点から見たジョハリの窓</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#FFF8F2' }}>
                        <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>開放の窓</p>
                        <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{multiReport.johari_open}</p>
                      </div>
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#F5F0EC' }}>
                        <p className="text-xs font-bold mb-1" style={{ color: '#3F342D99' }}>盲点の窓</p>
                        <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{multiReport.johari_blind}</p>
                      </div>
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#F0F0FA' }}>
                        <p className="text-xs font-bold mb-1" style={{ color: '#8B8DD4' }}>秘密の窓</p>
                        <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{multiReport.johari_hidden}</p>
                      </div>
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#EEF7F4' }}>
                        <p className="text-xs font-bold mb-1" style={{ color: '#6BB5A0' }}>未知の窓</p>
                        <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{multiReport.johari_unknown}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <OtherMultiPoller diagnosisId={id} />
            )
          ) : answerCount > 0 ? (
            <LockedSection unlockType="other_multi" diagnosisId={id} remaining={3 - answerCount}>
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>みんなから見たあなた</h2>
                <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #FAA66B22 0%, #F5A0C022 100%)', border: '1px solid #FAA66B33' }}>
                  <p className="text-xs mb-2" style={{ color: '#FAA66B99' }}>あなたが周囲に与えているもの</p>
                  <p className="text-xl font-bold mb-3" style={{ color: '#FAA66B' }}>〈場を整える力〉</p>
                  <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                    {['思いやり', '誠実さ', '安心感'].map((tag, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FAA66B1A', color: '#FAA66B' }}>{tag}</span>
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>3人以上の回答で、あなたが周囲に与えている本質的な価値が見えてきます。</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: '#FFF8F2' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>みんなが一致して感じていること</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>複数の人から一貫して見えているあなたの本質的な強みが明らかになります。</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[['開放の窓', '#FFF8F2', '#FAA66B'], ['盲点の窓', '#F5F0EC', '#3F342D99'], ['秘密の窓', '#F0F0FA', '#8B8DD4'], ['未知の窓', '#EEF7F4', '#6BB5A0']].map(([label, bg, color]) => (
                    <div key={label} className="rounded-xl p-3" style={{ backgroundColor: bg }}>
                      <p className="text-xs font-bold mb-1" style={{ color }}>{label}</p>
                      <p className="text-xs" style={{ color: '#3F342D66' }}>3人の視点で分析</p>
                    </div>
                  ))}
                </div>
              </div>
            </LockedSection>
          ) : null}
        </div>

        {/* ── 有料コンテンツ ── */}
        <div id="paid">
          {isPaidGenerating ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
                <span className="text-xs font-medium px-2" style={{ color: '#FAA66B' }}>詳細レポート</span>
                <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
              </div>
              <PaidResultStream diagnosisId={id} scores={sectionScores} />
              {answerCount === 0 && (
                <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#F5F0EC' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#3F342D' }}>他者診断と組み合わせるとさらに深い分析が届きます</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D66' }}>
                    友人・家族に診断してもらうと、他者視点とあなたの40問回答を統合した<br />深層分析が2項目追加されます。
                  </p>
                  <Link href={`/diagnosis/other?diagnosisId=${id}`} className="inline-block mt-3 px-4 py-2 rounded-full text-xs font-medium" style={{ backgroundColor: '#FAA66B', color: '#fff' }}>
                    他者診断を依頼する
                  </Link>
                </div>
              )}
            </div>
          ) : hasPaid ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
                <span className="text-xs font-medium px-2" style={{ color: '#FAA66B' }}>詳細レポート</span>
                <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
              </div>

              {/* ① 特性プロフィール レーダーチャート */}
              {sectionScores && (() => {
                const n = 5, cx = 130, cy = 112, maxR = 75
                const axes = [
                  { label: '消耗', score: sectionScores.section3 },
                  { label: '人間関係', score: sectionScores.section5 },
                  { label: '感情処理', score: sectionScores.section7 },
                  { label: '自己基準', score: sectionScores.section6 },
                  { label: '回復', score: sectionScores.section4 },
                ]
                const pt = (pct: number, i: number): [number, number] => {
                  const a = (i * 2 * Math.PI / n) - Math.PI / 2
                  const r = (pct / 100) * maxR
                  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
                }
                const axPt = (ratio: number, i: number): [number, number] => {
                  const a = (i * 2 * Math.PI / n) - Math.PI / 2
                  return [cx + ratio * maxR * Math.cos(a), cy + ratio * maxR * Math.sin(a)]
                }
                const toPath = (pts: [number, number][]) =>
                  pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + 'Z'
                const dataPath = toPath(axes.map((a, i) => pt(((a.score - 4) / 12) * 100, i)))
                const scoreLabel = (s: number) => s >= 12 ? '高め' : s >= 8 ? '中程度' : 'やや低め'
                const scoreColor = (s: number) => s >= 12 ? '#FAA66B' : s >= 8 ? '#8B8DD4' : '#6BB5A0'
                return (
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h2 className="text-sm font-bold mb-0.5" style={{ color: '#FAA66B' }}>あなたの特性プロフィール</h2>
                    <p className="text-xs mb-3" style={{ color: '#3F342D66' }}>40問の回答から算出した5つの特性スコア</p>
                    <svg viewBox="0 0 260 230" style={{ width: '100%', maxWidth: '260px', display: 'block', margin: '0 auto' }}>
                      {[0.25, 0.5, 0.75, 1].map(ratio => (
                        <path key={ratio} d={toPath(Array.from({length: n}, (_, i) => axPt(ratio, i)))}
                          fill="none" stroke="#E8DFD8" strokeWidth="0.75" />
                      ))}
                      {Array.from({length: n}, (_, i) => {
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
              })()}

              {paidReport!.hardship_root && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🌱</span>
                    <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>しんどさの根っこ</h2>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{paidReport!.hardship_root}</p>
                  {paidReport!.hardship_root_steps?.length === 4 && (() => {
                    const labels = ['気質・特性', 'しんどくなる状況', '内側の動き', 'しんどさの形']
                    const colors = ['#C49A76', '#B08060', '#9C6648', '#885030']
                    return (
                      <div className="rounded-xl p-4 space-y-1 mt-4" style={{ backgroundColor: '#FFF8F2' }}>
                        {labels.map((label, i) => (
                          <div key={i}>
                            <div className="flex items-start gap-2">
                              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5"
                                style={{ backgroundColor: colors[i] + '20', color: colors[i] }}>{label}</span>
                              <p className="text-xs leading-relaxed pt-0.5" style={{ color: '#3F342D' }}>{paidReport!.hardship_root_steps![i]}</p>
                            </div>
                            {i < 3 && <div className="ml-3 w-0.5 h-3 my-0.5 rounded-full" style={{ backgroundColor: colors[i] + '40' }} />}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                  {paidReport!.hardship_root_tip && (
                    <div className="flex items-start gap-2 mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF2E8', border: '1px solid #FAA66B22' }}>
                      <span className="text-sm shrink-0">💡</span>
                      <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{paidReport!.hardship_root_tip}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ② 反応連鎖フロー図 */}
              {paidReport!.core_pattern && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔄</span>
                    <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>典型的な反応連鎖</h2>
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{paidReport!.core_pattern}</p>
                  {paidReport!.reaction_flow && paidReport!.reaction_flow.length === 5 && (() => {
                    const labels = ['外的きっかけ', '内的解釈', '感情・身体反応', '行動', '結果']
                    const colors = ['#FAA66B', '#F09060', '#E07050', '#D06040', '#C05030']
                    return (
                      <div className="rounded-xl p-4 space-y-1" style={{ backgroundColor: '#FFF8F2' }}>
                        {labels.map((label, i) => (
                          <div key={i}>
                            <div className="flex items-start gap-2">
                              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5"
                                style={{ backgroundColor: colors[i] + '20', color: colors[i] }}>
                                {label}
                              </span>
                              <p className="text-xs leading-relaxed pt-0.5" style={{ color: '#3F342D' }}>
                                {paidReport!.reaction_flow![i]}
                              </p>
                            </div>
                            {i < 4 && <div className="ml-3 w-0.5 h-3 my-0.5 rounded-full" style={{ backgroundColor: colors[i] + '40' }} />}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                  {paidReport!.core_pattern_tip && (
                    <div className="flex items-start gap-2 mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF2E8', border: '1px solid #FAA66B22' }}>
                      <span className="text-sm shrink-0">💡</span>
                      <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{paidReport!.core_pattern_tip}</p>
                    </div>
                  )}
                </div>
              )}

              {paidReport!.relationship_pattern && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🤝</span>
                    <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>人間関係での傾向</h2>
                    {sectionScores && (() => {
                      const s = sectionScores.section5
                      const label = s >= 12 ? '高め' : s >= 8 ? '中程度' : 'やや低め'
                      const color = s >= 12 ? '#FAA66B' : s >= 8 ? '#8B8DD4' : '#6BB5A0'
                      return <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: color + '18', color }}>{label}</span>
                    })()}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{paidReport!.relationship_pattern}</p>
                  {paidReport!.relationship_steps?.length === 4 && (() => {
                    const labels = ['強みとして出ること', '起きやすいパターン', 'しんどくなる場面', '乗り越えのポイント']
                    const colors = ['#8B8DD4', '#7B7DC4', '#6B6DB4', '#5B5DA4']
                    return (
                      <div className="rounded-xl p-4 space-y-1 mt-4" style={{ backgroundColor: '#F5F0FA' }}>
                        {labels.map((label, i) => (
                          <div key={i}>
                            <div className="flex items-start gap-2">
                              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5"
                                style={{ backgroundColor: colors[i] + '20', color: colors[i] }}>{label}</span>
                              <p className="text-xs leading-relaxed pt-0.5" style={{ color: '#3F342D' }}>{paidReport!.relationship_steps![i]}</p>
                            </div>
                            {i < 3 && <div className="ml-3 w-0.5 h-3 my-0.5 rounded-full" style={{ backgroundColor: colors[i] + '40' }} />}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                  {paidReport!.relationship_tip && (
                    <div className="flex items-start gap-2 mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF2E8', border: '1px solid #FAA66B22' }}>
                      <span className="text-sm shrink-0">💡</span>
                      <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{paidReport!.relationship_tip}</p>
                    </div>
                  )}
                </div>
              )}

              {paidReport!.boundary_setting && (
                <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#FFF8F2' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🛡️</span>
                    <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>境界線の引き方</h2>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{paidReport!.boundary_setting}</p>
                  {paidReport!.boundary_steps?.length === 4 && (() => {
                    const labels = ['消耗サイン', '必要な理由', '引き方', '自分への許可']
                    const colors = ['#6BB5A0', '#5BA090', '#4B8B80', '#3B7670']
                    return (
                      <div className="rounded-xl p-4 space-y-1 mt-4" style={{ backgroundColor: '#EEF7F4' }}>
                        {labels.map((label, i) => (
                          <div key={i}>
                            <div className="flex items-start gap-2">
                              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5"
                                style={{ backgroundColor: colors[i] + '20', color: colors[i] }}>{label}</span>
                              <p className="text-xs leading-relaxed pt-0.5" style={{ color: '#3F342D' }}>{paidReport!.boundary_steps![i]}</p>
                            </div>
                            {i < 3 && <div className="ml-3 w-0.5 h-3 my-0.5 rounded-full" style={{ backgroundColor: colors[i] + '40' }} />}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                  {paidReport!.boundary_tip && (
                    <div className="flex items-start gap-2 mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF2E8', border: '1px solid #FAA66B22' }}>
                      <span className="text-sm shrink-0">💡</span>
                      <p className="text-xs leading-relaxed" style={{ color: '#3F342D' }}>{paidReport!.boundary_tip}</p>
                    </div>
                  )}
                </div>
              )}

              {paidReport!.ease_life && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🌤️</span>
                    <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>生きづらさを和らげるヒント</h2>
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{paidReport!.ease_life}</p>
                  {paidReport!.ease_hints && paidReport!.ease_hints.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {paidReport!.ease_hints.map((item, i) => (
                        <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#F0F4FF' }}>
                          <p className="text-xs font-bold mb-1" style={{ color: '#8B8DD4' }}>{item.title}</p>
                          <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {paidReport!.recovery_hint && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🪜</span>
                    <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>回復のヒント</h2>
                    {sectionScores && (() => {
                      const s = sectionScores.section4
                      const label = s >= 12 ? '高め' : s >= 8 ? '中程度' : 'やや低め'
                      const color = s >= 12 ? '#FAA66B' : s >= 8 ? '#8B8DD4' : '#6BB5A0'
                      return <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: color + '18', color }}>回復スタイル：{label}</span>
                    })()}
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{paidReport!.recovery_hint}</p>
                  {paidReport!.recovery_hint_items && paidReport!.recovery_hint_items.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {paidReport!.recovery_hint_items.map((item, i) => (
                        <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#FFF2E8' }}>
                          <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>{item.title}</p>
                          <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {paidReport!.ideal_work && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💼</span>
                    <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>向いてる働き方・仕事</h2>
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{paidReport!.ideal_work}</p>
                  {paidReport!.ideal_work_jobs && paidReport!.ideal_work_jobs.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {paidReport!.ideal_work_jobs.map((item, i) => (
                        <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#FFF2E8' }}>
                          <p className="text-xs font-bold mb-1" style={{ color: '#FAA66B' }}>{item.title}</p>
                          <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {paidReport!.growth_hint && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🗺️</span>
                    <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>自己成長のヒント</h2>
                    {sectionScores && (() => {
                      const s = sectionScores.section6
                      const label = s >= 12 ? '高め' : s >= 8 ? '中程度' : 'やや低め'
                      const color = s >= 12 ? '#FAA66B' : s >= 8 ? '#8B8DD4' : '#6BB5A0'
                      return <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: color + '18', color }}>自己基準：{label}</span>
                    })()}
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#3F342D' }}>{paidReport!.growth_hint}</p>
                  {paidReport!.growth_hint_items && paidReport!.growth_hint_items.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {paidReport!.growth_hint_items.map((item, i) => (
                        <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#F0F4FF' }}>
                          <p className="text-xs font-bold mb-1" style={{ color: '#8B8DD4' }}>{item.title}</p>
                          <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{item.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {paidReport!.letter && (
                <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#FFF2E8' }}>
                  <div className="flex justify-center mb-3">
                    <Image src="/potori/comforting.webp" alt="ぽとり" width={70} height={70} className="object-contain" />
                  </div>
                  <h2 className="text-sm font-bold mb-3 text-center" style={{ color: '#FAA66B' }}>今のあなたへの手紙</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#3F342D' }}>{paidReport!.letter.replace(/^.{1,20}さんへ[\r\n]+/, '')}</p>
                </div>
              )}

              {/* ── 有料×他者視点（1人以上） ── */}
              {answerCount === 0 ? (
                <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#F5F0EC' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#3F342D' }}>他者診断と組み合わせるとさらに深い分析が届きます</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D66' }}>
                    友人・家族に診断してもらうと、他者視点とあなたの40問回答を統合した<br />深層分析が2項目追加されます。
                  </p>
                  <Link href={`/diagnosis/other?diagnosisId=${id}`} className="inline-block mt-3 px-4 py-2 rounded-full text-xs font-medium" style={{ backgroundColor: '#FAA66B', color: '#fff' }}>
                    他者診断を依頼する
                  </Link>
                </div>
              ) : paidOtherSingle ? (
                <>
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
                    <span className="text-xs font-medium px-2" style={{ color: '#FAA66B' }}>他者視点 × 詳細分析</span>
                    <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h2 className="text-sm font-bold mb-3" style={{ color: '#FAA66B' }}>他者から見た消耗・回復パターン</h2>
                    <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{paidOtherSingle.other_deep_pattern}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h2 className="text-sm font-bold mb-3" style={{ color: '#FAA66B' }}>あなたの見えていない強み</h2>
                    <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{paidOtherSingle.hidden_strength}</p>
                  </div>
                </>
              ) : (
                <PaidOtherPoller diagnosisId={id} reportType="paid_other_single" />
              )}

              {/* ── 有料×他者視点（3人以上） ── */}
              {hasPaid && answerCount >= 3 && (
                paidOtherMulti ? (
                  <>
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <h2 className="text-sm font-bold mb-3" style={{ color: '#FAA66B' }}>複数人が感じるしんどさの根っこ</h2>
                      <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{paidOtherMulti.collective_root}</p>
                    </div>
                    <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#FFF8F2' }}>
                      <h2 className="text-sm font-bold mb-3" style={{ color: '#FAA66B' }}>みんなが信じるあなたの可能性</h2>
                      <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{paidOtherMulti.growth_potential}</p>
                    </div>
                  </>
                ) : (
                  <PaidOtherPoller diagnosisId={id} reportType="paid_other_multi" />
                )
              )}

              {/* 3人未満の場合：予告 */}
              {hasPaid && answerCount >= 1 && answerCount < 3 && (
                <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#F5F0EC' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#3F342D' }}>あと{3 - answerCount}人で複数視点の深層分析が解放されます</p>
                  <p className="text-xs" style={{ color: '#3F342D66' }}>複数人が感じるしんどさの根っこ・みんなが信じるあなたの可能性が届きます</p>
                  <Link href={`/diagnosis/other?diagnosisId=${id}`} className="inline-block mt-3 px-4 py-2 rounded-full text-xs font-medium" style={{ backgroundColor: '#FAA66B', color: '#fff' }}>
                    もっと依頼する
                  </Link>
                </div>
              )}
            </div>
          ) : hasPaidPayment ? (
            <div className="rounded-2xl p-5 shadow-sm text-center" style={{ backgroundColor: '#FFF2E8' }}>
              <div className="flex justify-center mb-3">
                <Image src="/potori/happy.webp" alt="ぽとり" width={70} height={70} className="object-contain" />
              </div>
              <p className="text-sm font-bold mb-2" style={{ color: '#3F342D' }}>診断の途中ですね</p>
              <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
                40問に回答するとレポートが届きます。<br />前回の途中から続けられます。
              </p>
              <Link
                href={`/diagnosis/paid/${id}/questions`}
                className="block w-full py-3 rounded-2xl text-white font-medium text-sm"
                style={{ backgroundColor: '#FAA66B' }}
              >
                続きから答える
              </Link>
            </div>
          ) : (
            <LockedSection unlockType="paid" diagnosisId={id}>
              <div className="space-y-3">
                {[
                  { title: 'しんどさの根っこ', body: 'なぜそのパターンになるのかを深掘りします。幼少期から積み重なってきた無意識のパターンの正体を丁寧に解説します。' },
                  { title: '回復のヒント', body: 'あなたの特性に合わせた、無理のない回復の方法があります。40問の回答をもとに個別に生成します。' },
                  { title: '向いてる働き方・仕事', body: 'あなたの特性が最も活かされる職場環境やコミュニケーションスタイルについて、具体的に解説します。' },
                  { title: '人間関係での傾向', body: '親しい人との関係で繰り返しやすいパターンと、それを乗り越えるヒントをお伝えします。' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                    <h2 className="text-sm font-bold mb-2" style={{ color: '#FAA66B' }}>{item.title}</h2>
                    <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{item.body}</p>
                  </div>
                ))}
              </div>
            </LockedSection>
          )}
        </div>

        {/* 完全版レポートセクション */}
        {(isPaidGenerating || hasPaid || htDiagnosisId || !!htPendingSessionId) && (
          <div id="ht">
            {!htDiagnosisId ? (
              htPendingSessionId ? (
                /* 購入済み・回答途中 */
                <div className="rounded-2xl p-5 shadow-sm text-center" style={{ backgroundColor: '#FFF2E8' }}>
                  <div className="flex justify-center mb-3">
                    <Image src="/potori/happy.webp" alt="ぽとり" width={70} height={70} className="object-contain" />
                  </div>
                  <p className="text-sm font-bold mb-2" style={{ color: '#3F342D' }}>完全版診断の途中ですね</p>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
                    回答を完了するとレポートが届きます。<br />前回の途中から続けられます。
                  </p>
                  <Link
                    href={`/diagnosis/high-ticket/questions?session_id=${htPendingSessionId}`}
                    className="block w-full py-3 rounded-2xl text-white font-medium text-sm"
                    style={{ backgroundColor: '#FAA66B' }}
                  >
                    続きから答える
                  </Link>
                </div>
              ) : (
              /* ¥4,960 CTA */
              <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#FFF2E8' }}>
                <div className="flex justify-center mb-3">
                  <Image src="/potori/good.webp" alt="ぽとり" width={70} height={70} className="object-contain" />
                </div>
                <h2 className="text-sm font-bold mb-2 text-center" style={{ color: '#FAA66B' }}>さらに深く知りたい方へ</h2>
                <p className="text-xs leading-relaxed mb-1 text-center" style={{ color: '#3F342D' }}>
                  才能診断60問・深層心理・スピリチュアルを統合した<br />完全版自己分析レポート（5種類）
                </p>
                <p className="text-xs text-center mb-4" style={{ color: '#3F342D66' }}>¥4,960 → ¥3,480（¥1,480割引適用）</p>
                <Link
                  href={`/diagnosis/high-ticket?freeId=${id}`}
                  className="block w-full py-3 rounded-2xl text-white font-medium text-sm text-center"
                  style={{ backgroundColor: '#FAA66B' }}
                >
                  完全版診断を受ける
                </Link>
              </div>
              )
            ) : htGenerating ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
                  <span className="text-xs font-medium px-2" style={{ color: '#FAA66B' }}>完全版レポート</span>
                  <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
                </div>
                <HighTicketResultStream diagnosisId={htDiagnosisId!} talentData={talentData} />
              {noteData && (
                <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #F0EAE5', backgroundColor: '#fff' }}>
                  <div className="px-5 pt-5 pb-1">
                    <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>じぶんノート</h2>
                    <p className="text-xs mt-1 mb-3" style={{ color: '#3F342D66' }}>高額診断購入者特典 · 気持ちをぽとりと整理するノートを作れます（3冊まで）</p>
                  </div>
                  <JibunnNoteClient
                    initialNotes={noteData.initialNotes}
                    initialLimit={noteData.initialLimit}
                    initialUseMonthlyReset={noteData.initialUseMonthlyReset}
                    initialNoteCredits={noteData.initialNoteCredits}
                    embedded
                  />
                </div>
              )}
              </div>
            ) : (
              /* 完全版レポート5セクション */
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
                  <span className="text-xs font-medium px-2" style={{ color: '#FAA66B' }}>完全版レポート</span>
                  <div className="h-px flex-1" style={{ backgroundColor: '#F0EAE5' }} />
                </div>

                <HighTicketResultStream diagnosisId={htDiagnosisId!} initialData={htInitialData} talentData={talentData} />

                {noteData && (
                  <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #F0EAE5', backgroundColor: '#fff' }}>
                    <div className="px-5 pt-5 pb-1">
                      <h2 className="text-sm font-bold" style={{ color: '#FAA66B' }}>じぶんノート</h2>
                      <p className="text-xs mt-1 mb-3" style={{ color: '#3F342D66' }}>高額診断購入者特典 · 気持ちをぽとりと整理するノートを作れます（3冊まで）</p>
                    </div>
                    <JibunnNoteClient
                      initialNotes={noteData.initialNotes}
                      initialLimit={noteData.initialLimit}
                      initialUseMonthlyReset={noteData.initialUseMonthlyReset}
                      initialNoteCredits={noteData.initialNoteCredits}
                      embedded
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
