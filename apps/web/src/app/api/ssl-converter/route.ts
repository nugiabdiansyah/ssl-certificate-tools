import { NextRequest, NextResponse } from 'next/server'
import { convertCert, CertFormat } from '@/lib/ssl-converter'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const certFile = formData.get('cert') as File | null
  const keyFile = formData.get('key') as File | null
  const targetFormat = formData.get('format') as CertFormat
  const passphrase = formData.get('passphrase') as string | null

  if (!certFile) return NextResponse.json({ error: 'Certificate file is required' }, { status: 400 })
  if (!['pem', 'der', 'pfx'].includes(targetFormat))
    return NextResponse.json({ error: 'Invalid target format. Choose pem, der, or pfx.' }, { status: 400 })

  const certText = await certFile.text()
  const keyText = keyFile ? await keyFile.text() : undefined

  try {
    const result = convertCert(certText, targetFormat, keyText, passphrase ?? undefined)
    return new NextResponse(result.data, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Conversion failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
