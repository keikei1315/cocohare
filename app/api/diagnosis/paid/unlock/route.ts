import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { diagnosisId } = await request.json()
    if (!diagnosisId) return NextResponse.json({ error: 'diagnosisIdが必要です' }, { status: 400 })

    const adminClient = createAdminClient()

    // この無料診断に紐づく高額診断の購入を確認
    const { data: htAnswers } = await adminClient
      .from('high_ticket_answers')
      .select('diagnosis_id')
      .eq('source_free_diagnosis_id', diagnosisId)
      .maybeSingle()

    if (!htAnswers) {
      return NextResponse.json({ error: '高額診断の購入が確認できませんでした' }, { status: 403 })
    }

    // 既に完了済みの支払いがあればスキップ
    const { data: existing } = await adminClient
      .from('payments')
      .select('id')
      .eq('diagnosis_id', diagnosisId)
      .eq('status', 'completed')
      .limit(1)

    if (!existing || existing.length === 0) {
      await adminClient.from('payments').insert({
        diagnosis_id: diagnosisId,
        stripe_session_id: `unlock_${diagnosisId}`,
        amount: 0,
        status: 'completed',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[paid unlock error]', err)
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 })
  }
}
