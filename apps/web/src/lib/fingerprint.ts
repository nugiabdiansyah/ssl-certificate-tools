import tls from 'tls'
import crypto from 'crypto'

export interface FingerprintResult {
  commonName: string
  organization: string
  issuer: string
  validFrom: string
  validTo: string
  daysRemaining: number
  serialNumber: string
  sha1: string     // "AB:CD:EF:..."
  sha256: string   // "12:34:56:..."
  proxmox: string  // "sha256:12:34:56:..."
  source: 'live' | 'file'
}

function toColonHex(buf: Buffer): string {
  return buf.toString('hex').toUpperCase().match(/.{2}/g)!.join(':')
}

export function computeFingerprints(der: Buffer): { sha1: string; sha256: string; proxmox: string } {
  const sha1   = toColonHex(crypto.createHash('sha1').update(der).digest())
  const sha256 = toColonHex(crypto.createHash('sha256').update(der).digest())
  return { sha1, sha256, proxmox: `sha256:${sha256}` }
}

// Parse "CN=foo\nO=bar\nC=US" or "CN=foo, O=bar" into a key-value map
function parseDN(dn: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of dn.split(/[\n,]/)) {
    const eq = part.indexOf('=')
    if (eq > 0) result[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }
  return result
}

function x509ToResult(
  x509: crypto.X509Certificate,
  der: Buffer,
  source: FingerprintResult['source'],
): FingerprintResult {
  const fps     = computeFingerprints(der)
  const subject = parseDN(x509.subject)
  const issuer  = parseDN(x509.issuer)
  const validTo = new Date(x509.validTo)
  const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / 86400000)

  return {
    commonName:   subject['CN'] || '',
    organization: subject['O']  || '',
    issuer:       issuer['CN']  || issuer['O'] || '',
    validFrom:    new Date(x509.validFrom).toISOString(),
    validTo:      validTo.toISOString(),
    daysRemaining,
    serialNumber: x509.serialNumber,
    source,
    ...fps,
  }
}

// crypto.X509Certificate supports RSA, EC (ECDSA), Ed25519, etc.
function derToResult(der: Buffer, source: FingerprintResult['source']): FingerprintResult {
  const x509 = new crypto.X509Certificate(der)
  return x509ToResult(x509, der, source)
}

export async function fetchCertFingerprint(host: string, port: number): Promise<FingerprintResult> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, rejectUnauthorized: false, servername: host }, () => {
      try {
        const cert = socket.getPeerCertificate()
        socket.destroy()
        if (!cert?.raw) return reject(new Error('No certificate returned from server'))
        resolve(derToResult(cert.raw, 'live'))
      } catch (e) {
        reject(e)
      }
    })
    socket.on('error', reject)
    socket.setTimeout(10000, () => { socket.destroy(); reject(new Error('Connection timed out')) })
  })
}

export function parseCertFingerprint(fileBuffer: Buffer): FingerprintResult {
  const str = fileBuffer.toString('utf8')
  if (str.includes('-----BEGIN CERTIFICATE-----')) {
    // Pass PEM string — X509Certificate handles RSA and EC keys alike
    const x509 = new crypto.X509Certificate(str)
    const der  = Buffer.from(x509.raw)
    return x509ToResult(x509, der, 'file')
  }
  // Assume DER
  return derToResult(fileBuffer, 'file')
}
