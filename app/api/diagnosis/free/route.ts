import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { calculateType } from '@/lib/diagnosis/types'

export async function POST(request: NextRequest) {
  try {
    const { answers, guestSessionId } = await request.json()

    if (!Array.isArray(answers) || answers.length !== 20) {
      return NextResponse.json({ error: '回答データが不正です' }, { status: 400 })
    }

    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    const { axis1Scores, axis2Scores, typeCode } = calculateType(answers)

    const adminClient = createAdminClient()

    const { data: diagnosis, error: diagError } = await adminClient
      .from('diagnoses')
      .insert({
        user_id: user?.id ?? null,
        guest_session_id: user ? null : (guestSessionId ?? null),
        type: 'free',
        version: 'v1',
        answers,
        scores: { axis1: axis1Scores, axis2: axis2Scores },
        personality_type: typeCode,
      })
      .select()
      .single()

    if (diagError) {
      console.error('[Supabase diagnosis error]', diagError)
      return NextResponse.json({ error: 'DB保存エラー' }, { status: 500 })
    }

    return NextResponse.json({ diagnosisId: diagnosis.id })
  } catch (err) {
    console.error('[diagnosis/free unexpected error]', err)
    return NextResponse.json(
      { error: `診断処理に失敗しました: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
