import { NextRequest, NextResponse } from 'next/server'
import { convertCert, buildPemBundle, buildTomcatKeystore, convertPrivateKey, CertFormat } from '@/lib/ssl-converter'

export const runtime = 'nodejs'

const VALID_FORMATS: CertFormat[] = ['pem', 'der', 'p7b', 'pfx']

/** Accept either a pre-merged bundle file OR separate intermediate + rootca files. */
async function resolveCaBundle(
  bundleFile: File | null,
  intermediateFile: File | null,
  rootcaFile: File | null,
): Promise<string | null> {
  if (bundleFile) return bundleFile.text()
  const parts: string[] = []
  if (intermediateFile) parts.push(await intermediateFile.text())
  if (rootcaFile)       parts.push(await rootcaFile.text())
  return parts.length ? parts.join('\n') : null
}

export async function POST(req: NextRequest) {
  const formData  = await req.formData()
  const mode      = (formData.get('mode') as string) ?? 'convert'

  try {
    // ── Build PEM bundle ─────────────────────────────────────────────────
    if (mode === 'bundle') {
      const certFile         = formData.get('cert')         as File | null
      const bundleFile       = formData.get('bundle')       as File | null
      const intermediateFile = formData.get('intermediate') as File | null
      const rootcaFile       = formData.get('rootca')       as File | null
      const keyFile          = formData.get('key')          as File | null

      if (!certFile) return NextResponse.json({ error: 'Certificate file is required' }, { status: 400 })

      const caBundleText = await resolveCaBundle(bundleFile, intermediateFile, rootcaFile)
      if (!caBundleText) return NextResponse.json({ error: 'CA bundle, intermediate CA, or root CA file is required' }, { status: 400 })

      const result = buildPemBundle(
        await certFile.text(),
        caBundleText,
        keyFile ? await keyFile.text() : undefined,
      )
      return new NextResponse(new Uint8Array(result.data), {
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      })
    }

    // ── Tomcat keystore (PKCS#12 with full chain) ────────────────────────
    if (mode === 'tomcat') {
      const certFile         = formData.get('cert')         as File | null
      const bundleFile       = formData.get('bundle')       as File | null
      const intermediateFile = formData.get('intermediate') as File | null
      const rootcaFile       = formData.get('rootca')       as File | null
      const keyFile          = formData.get('key')          as File | null
      const passphrase       = (formData.get('passphrase') as string) ?? ''
      const legacy           = formData.get('legacy') === 'true'

      if (!certFile) return NextResponse.json({ error: 'Certificate file is required' }, { status: 400 })
      if (!keyFile)  return NextResponse.json({ error: 'Private key file is required' }, { status: 400 })

      const caBundleText = await resolveCaBundle(bundleFile, intermediateFile, rootcaFile)
      if (!caBundleText) return NextResponse.json({ error: 'CA bundle, intermediate CA, or root CA file is required' }, { status: 400 })

      const result = buildTomcatKeystore(
        await certFile.text(),
        caBundleText,
        await keyFile.text(),
        passphrase,
        legacy,
      )
      return new NextResponse(new Uint8Array(result.data), {
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      })
    }

    // ── Private key encrypt / decrypt ───────────────────────────────────
    if (mode === 'key') {
      const keyFile   = formData.get('key')        as File | null
      const action    = (formData.get('action') as string | null) ?? 'decrypt'
      const passphrase = (formData.get('passphrase') as string) ?? ''

      if (!keyFile) return NextResponse.json({ error: 'Key file is required' }, { status: 400 })
      if (!passphrase) return NextResponse.json({ error: 'Passphrase is required' }, { status: 400 })

      const result = convertPrivateKey(await keyFile.text(), action as 'decrypt' | 'encrypt', passphrase)
      return new NextResponse(new Uint8Array(result.data), {
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      })
    }

    // ── Format conversion (default) ──────────────────────────────────────
    const certFile   = formData.get('cert') as File | null
    const keyFile    = formData.get('key')  as File | null
    const from       = formData.get('from') as CertFormat
    const to         = formData.get('to')   as CertFormat
    const passphrase = formData.get('passphrase') as string | null
    const legacy     = formData.get('legacy') === 'true'

    if (!certFile) return NextResponse.json({ error: 'Certificate file is required' }, { status: 400 })
    if (!VALID_FORMATS.includes(from)) return NextResponse.json({ error: 'Invalid source format' }, { status: 400 })
    if (!VALID_FORMATS.includes(to))   return NextResponse.json({ error: 'Invalid target format' }, { status: 400 })

    const certData: string | Buffer =
      from === 'pem' || from === 'p7b'
        ? await certFile.text()
        : Buffer.from(await certFile.arrayBuffer())

    const result = convertCert(
      certData,
      from,
      to,
      keyFile ? await keyFile.text() : undefined,
      passphrase ?? undefined,
      legacy,
    )
    return new NextResponse(new Uint8Array(result.data), {
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
