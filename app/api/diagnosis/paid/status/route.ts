import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { diagnosisId } = await request.json()
    if (!diagnosisId) return NextResponse.json({ ready: false })

    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('reports')
      .select('id')
      .eq('diagnosis_id', diagnosisId)
      .eq('type', 'paid')
      .maybeSingle()

    return NextResponse.json({ ready: !!data })
  } catch {
    return NextResponse.json({ ready: false })
  }
}
