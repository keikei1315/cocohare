import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import HighTicketResultStream from '@/app/components/HighTicketResultStream'
import JibunnNoteClient, { type Note } from '@/app/counseling/jibunn-note/client'
import { resolveNoteLimit } from '@/lib/resolve-note-limit'

export default async function HighTicketResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: answers } = await supabase
    .from('high_ticket_answers')
    .select('id')
    .eq('diagnosis_id', id)
    .maybeSingle()

  if (!answers) return notFound()

  const serverClient = await createClient()
  const [{ data: htReport }, { data: { user } }] = await Promise.all([
    supabase
      .from('reports')
      .select('content')
      .eq('diagnosis_id', id)
      .eq('type', 'high_ticket')
      .maybeSingle(),
    serverClient.auth.getUser(),
  ])

  const initialData = htReport?.content ? (htReport.content as Record<string, unknown>) : undefined

  const summaryTitle = (initialData?.summary as { title?: string } | undefined)?.title

  let noteData: { initialNotes: Note[]; initialLimit: number; initialUseMonthlyReset: boolean; initialNoteCredits: number } | null = null
  if (user) {
    const { data: diagnosisRow } = await supabase
      .from('diagnoses')
      .select('user_id')
      .eq('id', id)
      .maybeSingle()

    if (diagnosisRow?.user_id === user.id) {
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

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="px-4 pt-10 pb-6 text-center">
        <div className="flex justify-center mb-4">
          <Image src="/potori/happy.webp" alt="ぽとり" width={90} height={90} className="object-contain" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-xs mb-3 font-medium" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
          完全版自己分析レポート
        </div>
        <h1 className="text-lg font-bold leading-snug" style={{ color: '#3F342D' }}>
          {summaryTitle ?? 'レポートを生成中です'}
        </h1>
      </div>

      <div className="px-4 space-y-4 max-w-xl mx-auto">
        <HighTicketResultStream diagnosisId={id} initialData={initialData} />

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
    </div>
  )
}
