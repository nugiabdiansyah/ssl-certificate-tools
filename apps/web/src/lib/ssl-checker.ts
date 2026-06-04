import tls from 'tls'

export interface SslResult {
  status: 'valid' | 'expired' | 'invalid'
  daysRemaining: number
  issuedTo: string
  issuer: string
  validFrom: string
  validTo: string
  algorithm: string
  protocol: string
  sans: string[]
}

export function parseDomain(input: string): string {
  return input.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].trim()
}

export function buildSslResult(cert: {
  valid_to: string
  valid_from: string
  subject: { CN?: string }
  issuer: { O?: string; CN?: string }
  subjectaltname?: string
  bits?: number
}): SslResult {
  const now = Date.now()
  const validTo = new Date(cert.valid_to)
  const daysRemaining = Math.ceil((validTo.getTime() - now) / (1000 * 60 * 60 * 24))
  const status = daysRemaining < 0 ? 'expired' : 'valid'

  const sans = cert.subjectaltname
    ? cert.subjectaltname.split(', ').filter(s => s.startsWith('DNS:')).map(s => s.slice(4))
    : []

  return {
    status,
    daysRemaining,
    issuedTo: cert.subject.CN ?? 'Unknown',
    issuer: cert.issuer.O ?? cert.issuer.CN ?? 'Unknown',
    validFrom: new Date(cert.valid_from).toISOString().split('T')[0],
    validTo: validTo.toISOString().split('T')[0],
    algorithm: cert.bits ? `RSA ${cert.bits}-bit` : 'Unknown',
    protocol: 'TLS',
    sans,
  }
}

export async function checkSsl(domain: string, port = 443): Promise<SslResult> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: domain, port, servername: domain, rejectUnauthorized: false },
      () => {
        const raw = socket.getPeerCertificate()
        const protocol = socket.getProtocol() ?? 'TLS'
        socket.end()
        if (!raw || !raw.subject) {
          reject(new Error('No certificate found'))
          return
        }
        const result = buildSslResult(raw as Parameters<typeof buildSslResult>[0])
        result.protocol = protocol
        resolve(result)
      }
    )
    socket.setTimeout(10000, () => { socket.destroy(); reject(new Error('Connection timed out')) })
    socket.on('error', (err) => reject(new Error(`Connection failed: ${err.message}`)))
  })
}
