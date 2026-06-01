import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import OtherDiagnosisClient from './client'

async function getLinkData(token: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('other_perspective_links')
    .select('requester_name')
    .eq('token', token)
    .maybeSingle()
  return data
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const link = await getLinkData(token)
  const name = link?.requester_name || 'あなたの友人'

  return {
    title: `${name}さんからの診断依頼 | CocoHare`,
    description: `${name}さんから「他者診断」のお願いが届いています。20問に答えるだけ！`,
    openGraph: {
      title: `${name}さんの性格診断に答えてみて！`,
      description: `「${name}さんにはこれが当てはまる？」20問の他者視点診断です。CocoHare（ここはれ）`,
      images: [{ url: '/logo.png', width: 800, height: 600 }],
    },
  }
}

export default async function OtherDiagnosisTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const link = await getLinkData(token)

  if (!link) return notFound()

  return (
    <OtherDiagnosisClient
      token={token}
      requesterName={link.requester_name ?? ''}
    />
  )
}
