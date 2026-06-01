import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const next = searchParams.get('next') ?? '/'

  if (token_hash) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
