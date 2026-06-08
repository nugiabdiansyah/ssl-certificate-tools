import { NextRequest, NextResponse } from 'next/server'
import { fetchCertFingerprint, parseCertFingerprint } from '@/lib/fingerprint'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') ?? ''

    if (ct.includes('application/json')) {
      const { host, port } = await req.json()
      if (!host) return NextResponse.json({ error: 'host is required' }, { status: 400 })
      const portNum = Number(port) || 443
      const result = await fetchCertFingerprint(host.trim(), portNum)
      return NextResponse.json(result)
    }

    // FormData — file upload
    const form = await req.formData()
    const certFile = form.get('cert') as File | null
    if (!certFile) return NextResponse.json({ error: 'cert file is required' }, { status: 400 })
    const buffer = Buffer.from(await certFile.arrayBuffer())
    const result = parseCertFingerprint(buffer)
    return NextResponse.json(result)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
