import tls from 'tls'
import dns from 'dns'
import https from 'https'
import crypto from 'crypto'
import forge from 'node-forge'

export interface ChainCert {
  commonName: string
  organization: string
  country: string
  validFrom: string
  validTo: string
  serialNumber: string
  signatureAlgorithm: string
  issuerCN: string
  sans: string[]
  isLeaf: boolean
  isRoot: boolean
  sha1Fingerprint: string
  sha256Fingerprint: string
}

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
  resolvedIp: string
  serverType: string
  hostnameValid: boolean
  isTrusted: boolean
  chain: ChainCert[]
}

const SIG_ALG_OID: Record<string, string> = {
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.4': 'md5WithRSAEncryption',
  '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
  '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',
}

function getSignatureAlgorithm(raw: Buffer): string {
  try {
    const b64 = raw.toString('base64').match(/.{1,64}/g)!.join('\n')
    const pem = `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----`
    const cert = forge.pki.certificateFromPem(pem)
    return SIG_ALG_OID[cert.siginfo.algorithmOid] ?? cert.siginfo.algorithmOid
  } catch {
    return 'Unknown'
  }
}

// Node.js tls.Certificate fields can be string | string[] (multi-value RDNs)
function s(v: string | string[] | undefined, fallback = ''): string {
  if (v === undefined) return fallback
  return Array.isArray(v) ? (v[0] ?? fallback) : v
}

function parseSans(subjectaltname?: string | string[]): string[] {
  const raw = Array.isArray(subjectaltname) ? subjectaltname.join(', ') : subjectaltname
  if (!raw) return []
  return raw.split(', ').filter(x => x.startsWith('DNS:')).map(x => x.slice(4))
}

function matchesHostname(domain: string, cert: tls.PeerCertificate): boolean {
  const sans = parseSans(cert.subjectaltname)
  const cn = s(cert.subject.CN)
  const patterns = sans.length > 0 ? sans : [cn]
  return patterns.some((p) => {
    if (!p.startsWith('*.')) return p.toLowerCase() === domain.toLowerCase()
    const suffix = p.slice(1).toLowerCase()
    const host = domain.toLowerCase()
    return host.endsWith(suffix) && !host.slice(0, -suffix.length).includes('.')
  })
}

function traverseChain(root: tls.DetailedPeerCertificate): tls.DetailedPeerCertificate[] {
  const chain: tls.DetailedPeerCertificate[] = []
  const seen = new Set<string>()
  let cur: tls.DetailedPeerCertificate | null = root
  while (cur && !seen.has(cur.serialNumber) && chain.length < 10) {
    seen.add(cur.serialNumber)
    chain.push(cur)
    const issuer: tls.DetailedPeerCertificate = cur.issuerCertificate
    if (!issuer || issuer.serialNumber === cur.serialNumber) break
    cur = issuer
  }
  return chain
}

function certFingerprints(raw: Buffer): { sha1: string; sha256: string } {
  const toColon = (b: Buffer) => b.toString('hex').toUpperCase().match(/.{2}/g)!.join(':')
  return {
    sha1:   toColon(crypto.createHash('sha1').update(raw).digest()),
    sha256: toColon(crypto.createHash('sha256').update(raw).digest()),
  }
}

function buildChainCert(cert: tls.DetailedPeerCertificate, isLeaf: boolean, isRoot: boolean): ChainCert {
  const fps = certFingerprints(cert.raw)
  return {
    commonName: s(cert.subject.CN) || s(cert.subject.O) || 'Unknown',
    organization: s(cert.subject.O),
    country: s(cert.subject.C),
    validFrom: new Date(cert.valid_from).toISOString(),
    validTo: new Date(cert.valid_to).toISOString(),
    serialNumber: cert.serialNumber.toLowerCase(),
    signatureAlgorithm: getSignatureAlgorithm(cert.raw),
    issuerCN: s(cert.issuer.CN) || s(cert.issuer.O) || 'Unknown',
    sans: parseSans(cert.subjectaltname),
    isLeaf,
    isRoot,
    sha1Fingerprint:   fps.sha1,
    sha256Fingerprint: fps.sha256,
  }
}

function certificateKeyAlgorithm(cert: { bits?: number; asn1Curve?: string }): string {
  if (cert.asn1Curve) return `ECDSA (${cert.asn1Curve})`
  return cert.bits ? `RSA ${cert.bits}-bit` : 'Unknown'
}

async function resolveIp(domain: string): Promise<string> {
  try {
    const { address } = await dns.promises.lookup(domain, { family: 4 })
    return address
  } catch {
    return 'Unknown'
  }
}

async function getServerType(domain: string, port: number): Promise<string> {
  return new Promise((resolve) => {
    const req = https.request(
      { host: domain, port, method: 'HEAD', path: '/', rejectUnauthorized: false, timeout: 5000 },
      (res) => resolve((res.headers['server'] as string) ?? 'Unknown')
    )
    req.on('timeout', () => { req.destroy(); resolve('Unknown') })
    req.on('error', () => resolve('Unknown'))
    req.end()
  })
}

async function checkTrust(domain: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: domain, port, servername: domain, rejectUnauthorized: true },
      () => { socket.end(); resolve(true) }
    )
    socket.setTimeout(8000, () => { socket.destroy(); resolve(false) })
    socket.on('error', () => resolve(false))
  })
}

export function parseDomain(input: string): string {
  return input.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].trim()
}

// Kept for unit tests — does not require a live connection
export function buildSslResult(cert: {
  valid_to: string
  valid_from: string
  subject: { CN?: string }
  issuer: { O?: string; CN?: string }
  subjectaltname?: string
  bits?: number
  asn1Curve?: string
}) {
  const now = Date.now()
  const validTo = new Date(cert.valid_to)
  const daysRemaining = Math.ceil((validTo.getTime() - now) / (1000 * 60 * 60 * 24))
  return {
    status: (daysRemaining < 0 ? 'expired' : 'valid') as 'valid' | 'expired',
    daysRemaining,
    issuedTo: s(cert.subject.CN as string | undefined) || 'Unknown',
    issuer: s(cert.issuer.O as string | undefined) || s(cert.issuer.CN as string | undefined) || 'Unknown',
    validFrom: new Date(cert.valid_from).toISOString().split('T')[0],
    validTo: validTo.toISOString().split('T')[0],
    algorithm: certificateKeyAlgorithm(cert),
    sans: parseSans(cert.subjectaltname),
  }
}

export async function checkSsl(domain: string, port = 443): Promise<SslResult> {
  const [resolvedIp, serverType, isTrusted] = await Promise.all([
    resolveIp(domain),
    getServerType(domain, port),
    checkTrust(domain, port),
  ])

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: domain, port, servername: domain, rejectUnauthorized: false },
      () => {
        const raw = socket.getPeerCertificate(true)
        const protocol = socket.getProtocol() ?? 'TLS'
        socket.end()

        if (!raw || !raw.subject) {
          reject(new Error('No certificate found'))
          return
        }

        const now = Date.now()
        const validTo = new Date(raw.valid_to)
        const daysRemaining = Math.ceil((validTo.getTime() - now) / (1000 * 60 * 60 * 24))
        const sans = parseSans(raw.subjectaltname)

        const rawChain = traverseChain(raw)
        const chain = rawChain.map((c, i) =>
          buildChainCert(c, i === 0, i === rawChain.length - 1)
        )

        const keyAlgo = certificateKeyAlgorithm(raw as tls.DetailedPeerCertificate & { asn1Curve?: string })

        resolve({
          status: daysRemaining < 0 ? 'expired' : 'valid',
          daysRemaining,
          issuedTo: s(raw.subject.CN) || 'Unknown',
          issuer: s(raw.issuer.O) || s(raw.issuer.CN) || 'Unknown',
          validFrom: new Date(raw.valid_from).toISOString().split('T')[0],
          validTo: validTo.toISOString().split('T')[0],
          algorithm: keyAlgo,
          protocol,
          sans,
          resolvedIp,
          serverType,
          hostnameValid: matchesHostname(domain, raw),
          isTrusted,
          chain,
        })
      }
    )
    socket.setTimeout(10000, () => { socket.destroy(); reject(new Error('Connection timed out')) })
    socket.on('error', (err) => reject(new Error(`Connection failed: ${err.message}`)))
  })
}
