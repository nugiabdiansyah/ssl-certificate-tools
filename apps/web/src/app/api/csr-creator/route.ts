import { NextRequest, NextResponse } from 'next/server'
import { createCsr, type CsrKeyAlgorithm } from '@/lib/csr-creator'

export const runtime = 'nodejs'

const VALID_ALGORITHMS: CsrKeyAlgorithm[] = ['ecdsa-p384', 'ecdsa-p256', 'ecdsa-p521', 'rsa-2048', 'rsa-4096']

function splitSans(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean)
  if (typeof value !== 'string') return []
  return value.split(/[\n,]/).map(v => v.trim()).filter(Boolean)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const algorithm = body.keyAlgorithm as CsrKeyAlgorithm | undefined

    if (algorithm && !VALID_ALGORITHMS.includes(algorithm)) {
      return NextResponse.json({ error: 'Invalid key algorithm' }, { status: 400 })
    }

    const result = createCsr({
      commonName: String(body.commonName ?? ''),
      organization: body.organization,
      organizationalUnit: body.organizationalUnit,
      country: body.country,
      state: body.state,
      locality: body.locality,
      email: body.email,
      sans: splitSans(body.sans),
      keyAlgorithm: algorithm,
      encryptPrivateKey: Boolean(body.encryptPrivateKey),
      privateKeyPassword: body.privateKeyPassword,
      existingPrivateKeyPem: body.mode === 'existing-key' ? body.existingPrivateKeyPem : undefined,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create CSR'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
