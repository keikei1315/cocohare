import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 1)
  const cutoffISO = cutoff.toISOString()

  const [notesResult, reportsResult] = await Promise.all([
    adminClient.from('jibunn_notes').delete().lt('created_at', cutoffISO),
    adminClient.from('counseling_reports').delete().lt('created_at', cutoffISO),
  ])

  // 期限切れのprofile_factsを各ユーザーから削除
  const today = new Date().toISOString().split('T')[0]
  const { data: allMemories } = await adminClient
    .from('user_memories')
    .select('user_id, profile_facts')
  let memoriesCleanedCount = 0
  if (allMemories) {
    for (const mem of allMemories) {
      const activeFacts = (mem.profile_facts ?? []).filter(
        (f: { fact: string; expires_at: string }) => f.expires_at >= today
      )
      if (activeFacts.length !== (mem.profile_facts ?? []).length) {
        await adminClient
          .from('user_memories')
          .update({ profile_facts: activeFacts, updated_at: new Date().toISOString() })
          .eq('user_id', mem.user_id)
        memoriesCleanedCount++
      }
    }
  }

  return NextResponse.json({
    cutoff: cutoffISO,
    jibunn_notes: notesResult.error ? `error: ${notesResult.error.message}` : 'ok',
    counseling_reports: reportsResult.error ? `error: ${reportsResult.error.message}` : 'ok',
    memories_cleaned: memoriesCleanedCount,
  })
}
