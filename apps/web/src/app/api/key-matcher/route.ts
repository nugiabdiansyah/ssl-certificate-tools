import { NextRequest, NextResponse } from 'next/server'
import { matchKeyToCert } from '@/lib/key-matcher'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { cert, key } = await req.json()
  if (!cert || !key) return NextResponse.json({ error: 'Certificate and private key are both required' }, { status: 400 })
  try {
    return NextResponse.json(matchKeyToCert(cert, key))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Parse error'
    return NextResponse.json({ error: `Invalid input: ${message}` }, { status: 400 })
  }
}
