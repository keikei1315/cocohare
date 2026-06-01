import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'abckeigo.1315@gmail.com'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, email, subscription_plan, subscription_status, created_at')
    .order('created_at', { ascending: false })

  return NextResponse.json({ profiles: profiles ?? [] })
}
