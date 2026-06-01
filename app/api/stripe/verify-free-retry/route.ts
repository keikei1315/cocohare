import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    if (!sessionId) return NextResponse.json({ valid: false })

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const valid = session.payment_status === 'paid' && session.metadata?.type === 'free_retry'
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
