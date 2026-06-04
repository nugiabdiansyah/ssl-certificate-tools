import { NextRequest, NextResponse } from 'next/server'
import { decodeCert } from '@/lib/cert-decoder'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { pem } = await req.json()
  if (!pem) return NextResponse.json({ error: 'Certificate is required' }, { status: 400 })
  try {
    return NextResponse.json(decodeCert(pem))
  } catch {
    return NextResponse.json({ error: 'Invalid certificate format. Paste a PEM or base64 DER certificate.' }, { status: 400 })
  }
}
