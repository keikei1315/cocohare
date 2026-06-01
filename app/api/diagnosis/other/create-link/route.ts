import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { diagnosisId, requesterName } = await request.json()

    if (!diagnosisId) {
      return NextResponse.json({ error: 'diagnosisIdが必要です' }, { status: 400 })
    }

    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    const adminClient = createAdminClient()

    const { data: diagnosis } = await adminClient
      .from('diagnoses')
      .select('id')
      .eq('id', diagnosisId)
      .single()

    if (!diagnosis) {
      return NextResponse.json({ error: '診断が見つかりません' }, { status: 404 })
    }

    // 最大4件チェック
    const { count } = await adminClient
      .from('other_perspective_links')
      .select('id', { count: 'exact', head: true })
      .eq('diagnosis_id', diagnosisId)

    if ((count ?? 0) >= 4) {
      return NextResponse.json({ error: 'リンクは最大4件まで発行できます' }, { status: 400 })
    }

    const { data: link, error } = await adminClient
      .from('other_perspective_links')
      .insert({
        diagnosis_id: diagnosisId,
        user_id: user?.id ?? null,
        requester_name: requesterName ?? '',
      })
      .select('token')
      .single()

    if (error) {
      console.error('[create-link error]', error)
      return NextResponse.json({ error: 'リンク作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ token: link.token })
  } catch (err) {
    return NextResponse.json(
      { error: `処理に失敗しました: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
