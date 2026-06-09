import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateSectionScores } from '@/lib/diagnosis/paid-questions'
import PaidResultStream from '@/app/components/PaidResultStream'

export default async function PaidResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: payment } = await supabase
    .from('payments')
    .select('status')
    .eq('diagnosis_id', id)
    .eq('status', 'completed')
    .maybeSingle()

  if (!payment) redirect(`/diagnosis/free/result/${id}`)

  const [{ data: paidRow }, { data: freeReport }, { data: paidAnswers }] = await Promise.all([
    supabase.from('reports').select('content').eq('diagnosis_id', id).eq('type', 'paid').maybeSingle(),
    supabase.from('reports').select('content').eq('diagnosis_id', id).eq('type', 'free').maybeSingle(),
    supabase.from('paid_diagnosis_answers').select('answers').eq('diagnosis_id', id).maybeSingle(),
  ])

  const typeName = (freeReport?.content as { typeName?: string } | null)?.typeName ?? ''
  const initialData = paidRow?.content ? (paidRow.content as object) : undefined
  const scores = paidAnswers?.answers ? calculateSectionScores(paidAnswers.answers as number[]) : null

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#FFF9F5' }}>

      <div className="px-4 pt-10 pb-8 text-center">
        <div className="flex justify-center mb-4">
          <Image src="/potori/happy.webp" alt="ぽとり" width={90} height={90} className="object-contain" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-xs mb-3" style={{ backgroundColor: '#FAA66B', color: '#fff' }}>
          詳細レポート
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: '#3F342D' }}>「{typeName}」の詳細診断</h1>
        <p className="text-sm" style={{ color: '#3F342D66' }}>あなたの特性を深く掘り下げました</p>
      </div>

      <div className="px-4 max-w-xl mx-auto space-y-4">
        <PaidResultStream diagnosisId={id} initialData={initialData} scores={scores} />

        <Link
          href={`/diagnosis/free/result/${id}`}
          className="block text-center text-xs py-3"
          style={{ color: '#3F342D66' }}
        >
          ← 無料診断結果に戻る
        </Link>
      </div>
    </div>
  )
}
