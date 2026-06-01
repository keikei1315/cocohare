import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { diagnosisId } = await request.json()
    if (!diagnosisId) return NextResponse.json({ error: 'missing diagnosisId' }, { status: 400 })

    const adminClient = createAdminClient()

    const { data: links } = await adminClient
      .from('other_perspective_links')
      .select('id')
      .eq('diagnosis_id', diagnosisId)

    const linkIds = links?.map(l => l.id) ?? []
    if (!linkIds.length) return NextResponse.json({ ready: false })

    const { data: answer } = await adminClient
      .from('other_perspective_answers')
      .select('comparison')
      .in('link_id', linkIds)
      .not('comparison', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ ready: !!answer?.comparison })
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
