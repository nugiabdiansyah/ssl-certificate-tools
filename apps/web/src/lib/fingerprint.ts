import tls from 'tls'
import crypto from 'crypto'
import forge from 'node-forge'

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

function derToResult(der: Buffer, source: FingerprintResult['source']): FingerprintResult {
  const fps = computeFingerprints(der)

  const asn1 = forge.asn1.fromDer(der.toString('binary'))
  const cert = forge.pki.certificateFromAsn1(asn1)

  const attr = (obj: forge.pki.Certificate['subject'], name: string): string =>
    (obj.getField(name)?.value as string) || ''

  const now = Date.now()
  const validTo = cert.validity.notAfter.getTime()
  const daysRemaining = Math.floor((validTo - now) / 86400000)

  return {
    commonName:   attr(cert.subject, 'CN'),
    organization: attr(cert.subject, 'O'),
    issuer:       attr(cert.issuer, 'CN') || attr(cert.issuer, 'O'),
    validFrom:    cert.validity.notBefore.toISOString(),
    validTo:      cert.validity.notAfter.toISOString(),
    daysRemaining,
    serialNumber: cert.serialNumber,
    source,
    ...fps,
  }
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
  let der: Buffer

  if (str.includes('-----BEGIN CERTIFICATE-----')) {
    const match = str.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)
    if (!match) throw new Error('No certificate block found in file')
    const forgeCert = forge.pki.certificateFromPem(match[0])
    der = Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(forgeCert)).getBytes(), 'binary')
  } else {
    der = fileBuffer
  }

  return derToResult(der, 'file')
}
