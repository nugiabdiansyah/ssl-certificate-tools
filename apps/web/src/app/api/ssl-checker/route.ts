import { NextRequest, NextResponse } from 'next/server'
import { checkSsl, parseDomain } from '@/lib/ssl-checker'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { domain, port } = await req.json()
  if (!domain) return NextResponse.json({ error: 'Domain is required' }, { status: 400 })

  const clean = parseDomain(domain)
  if (!clean) return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })

  try {
    const result = await checkSsl(clean, port ?? 443)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
