import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { diagnosisId, answers } = await request.json()

    if (!diagnosisId || !Array.isArray(answers) || answers.length !== 20) {
      return NextResponse.json({ error: '入力データが不正です' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 支払い確認
    const { data: payments } = await adminClient
      .from('payments')
      .select('id')
      .eq('diagnosis_id', diagnosisId)
      .eq('status', 'completed')
      .limit(1)

    if (!payments || payments.length === 0) {
      return NextResponse.json({ error: '有効な決済が見つかりません' }, { status: 403 })
    }

    // 回答保存（重複防止）
    const { error: saveError } = await adminClient
      .from('paid_diagnosis_answers')
      .upsert({ diagnosis_id: diagnosisId, answers }, { onConflict: 'diagnosis_id' })

    if (saveError) {
      console.error('[paid submit save error]', saveError)
      return NextResponse.json({ error: 'DB保存エラー' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: `処理に失敗しました: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
