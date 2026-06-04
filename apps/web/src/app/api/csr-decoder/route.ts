import { NextRequest, NextResponse } from 'next/server'
import { decodeCsr } from '@/lib/csr-decoder'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { pem } = await req.json()
  if (!pem) return NextResponse.json({ error: 'CSR PEM is required' }, { status: 400 })
  try {
    return NextResponse.json(decodeCsr(pem))
  } catch {
    return NextResponse.json({ error: 'Invalid CSR format. Paste a valid PEM-encoded CSR.' }, { status: 400 })
  }
}
