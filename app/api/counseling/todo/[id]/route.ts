import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const adminClient = createAdminClient()

  const updateData: Record<string, unknown> = {}
  if (typeof body.completed === 'boolean') updateData.completed = body.completed
  if (typeof body.content === 'string') updateData.content = body.content

  const { data, error } = await adminClient
    .from('jibunn_todos')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ todo: data })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { id } = await params
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('jibunn_todos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
