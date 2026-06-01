import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let fontData: ArrayBuffer | null = null
  try {
    fontData = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.19/files/noto-sans-jp-japanese-700-normal.woff2'
    ).then(res => res.arrayBuffer())
  } catch {}

  const supabase = createAdminClient()

  const { data: report } = await supabase
    .from('reports')
    .select('content')
    .eq('diagnosis_id', id)
    .eq('type', 'free')
    .single()

  const c = report?.content as {
    typeName?: string
    tagline?: string
    axis1Name?: string
    axis2Name?: string
  } | null

  const typeName = c?.typeName ?? '性格タイプ診断'
  const tagline = c?.tagline ?? 'こころ晴れる毎日を'
  const traits = c?.axis1Name && c?.axis2Name ? `${c.axis1Name} × ${c.axis2Name}` : ''

  return new ImageResponse(
    (
      <div
        style={{
          background: '#FFF9F5',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: fontData ? 'Noto Sans JP' : 'sans-serif',
          position: 'relative',
        }}
      >
        {/* 左上アクセント */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 12, height: '100%', background: '#FAA66B',
        }} />

        {/* サービス名 */}
        <div style={{ fontSize: 26, color: '#FAA66B', marginBottom: 28, fontWeight: 700 }}>
          CocoHare（ここはれ）
        </div>

        {/* 特性 */}
        {traits ? (
          <div style={{ fontSize: 22, color: '#3F342D66', marginBottom: 16 }}>
            {traits}
          </div>
        ) : null}

        {/* タイプ名 */}
        <div style={{
          fontSize: 66,
          fontWeight: 700,
          color: '#3F342D',
          marginBottom: 24,
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          {typeName}
        </div>

        {/* タグライン */}
        <div style={{
          fontSize: 28,
          color: '#3F342D99',
          textAlign: 'center',
          lineHeight: 1.6,
          maxWidth: 800,
        }}>
          {tagline}
        </div>

        {/* 下部 */}
        <div style={{
          position: 'absolute',
          bottom: 44,
          fontSize: 20,
          color: '#3F342D66',
        }}>
          #CocoHare #ここはれ #性格診断
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ? [{ name: 'Noto Sans JP', data: fontData, weight: 700 as const }] : [],
    }
  )
}
