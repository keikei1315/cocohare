import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const diagnosisId = request.nextUrl.searchParams.get('diagnosisId')
  if (!diagnosisId) {
    return NextResponse.json({ error: 'diagnosisIdが必要です' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: links } = await adminClient
    .from('other_perspective_links')
    .select('id, token, requester_name, created_at')
    .eq('diagnosis_id', diagnosisId)
    .order('created_at', { ascending: true })

  if (!links || links.length === 0) {
    return NextResponse.json({ links: [], answerCount: 0 })
  }

  const linkIds = links.map(l => l.id)
  const { data: answers } = await adminClient
    .from('other_perspective_answers')
    .select('link_id')
    .in('link_id', linkIds)

  const answeredLinkIds = new Set(answers?.map(a => a.link_id) ?? [])

  const result = links.map(link => ({
    token: link.token,
    answered: answeredLinkIds.has(link.id),
  }))

  return NextResponse.json({ links: result, answerCount: answeredLinkIds.size })
}
