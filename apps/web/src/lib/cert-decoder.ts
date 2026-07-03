import forge from 'node-forge'
import { X509Certificate } from 'crypto'
import { classifyDomainType, type DomainType } from './domain-classifier'

export interface CertInfo {
  subject: { commonName: string; organization: string; organizationalUnit: string; country: string; state: string; locality: string }
  issuer: { commonName: string; organization: string; country: string }
  serialNumber: string
  validFrom: string
  validTo: string
  daysRemaining: number
  publicKey: { algorithm: string; bits: number }
  signatureAlgorithm: string
  sans: string[]
  domainType: DomainType
  keyUsage: string[]
  extKeyUsage: string[]
  fingerprintSha1: string
  fingerprintSha256: string
  pemRaw: string
}

function getField(dn: forge.pki.Certificate['subject'], name: string): string {
  const f = dn.getField(name)
  return f ? (f.value as string) : ''
}

function fingerprint(cert: forge.pki.Certificate, algorithm: 'sha1' | 'sha256'): string {
  const md = algorithm === 'sha1' ? forge.md.sha1.create() : forge.md.sha256.create()
  md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes())
  return md.digest().toHex().toUpperCase().match(/.{2}/g)!.join(':')
}

function parseCryptoCertificate(input: string): X509Certificate {
  const trimmed = input.trim()
  if (trimmed.startsWith('-----BEGIN CERTIFICATE-----')) return new X509Certificate(trimmed)
  return new X509Certificate(Buffer.from(trimmed, 'base64'))
}

function parseSubjectAltNames(subjectAltName?: string): string[] {
  if (!subjectAltName) return []
  return subjectAltName
    .split(/,\s*/)
    .filter(name => name.startsWith('DNS:'))
    .map(name => name.slice(4))
}

function pemFromRaw(raw: Buffer): string {
  const body = raw.toString('base64').match(/.{1,64}/g)?.join('\n') ?? ''
  return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----\n`
}

function cryptoPublicKeyInfo(cert: X509Certificate): { algorithm: string; bits: number } {
  const details = cert.publicKey.asymmetricKeyDetails as { modulusLength?: number; namedCurve?: string } | undefined
  const legacy = cert.toLegacyObject() as { bits?: number; asn1Curve?: string }

  switch (cert.publicKey.asymmetricKeyType) {
    case 'rsa':
    case 'rsa-pss':
      return { algorithm: 'RSA', bits: details?.modulusLength ?? legacy.bits ?? 0 }
    case 'ec':
      return { algorithm: 'ECDSA', bits: legacy.bits ?? curveBits(details?.namedCurve ?? legacy.asn1Curve) }
    case 'ed25519':
      return { algorithm: 'Ed25519', bits: 256 }
    case 'ed448':
      return { algorithm: 'Ed448', bits: 456 }
    default:
      return { algorithm: cert.publicKey.asymmetricKeyType ?? 'Unknown', bits: legacy.bits ?? 0 }
  }
}

function curveBits(curve?: string): number {
  if (!curve) return 0
  const known: Record<string, number> = {
    prime256v1: 256,
    secp256r1: 256,
    secp384r1: 384,
    secp521r1: 521,
  }
  return known[curve] ?? Number(curve.match(/\d+/)?.[0] ?? 0)
}

function decodeCertWithCrypto(pemOrDer: string): CertInfo {
  const cert = parseCryptoCertificate(pemOrDer)
  const legacy = cert.toLegacyObject() as {
    subject?: { CN?: string; O?: string; OU?: string; C?: string; ST?: string; L?: string }
    issuer?: { CN?: string; O?: string; C?: string }
    subjectaltname?: string
    ext_key_usage?: string[]
  }
  const subject = legacy.subject ?? {}
  const issuer = legacy.issuer ?? {}
  const validFrom = new Date(cert.validFrom)
  const validTo = new Date(cert.validTo)
  const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const sans = parseSubjectAltNames(legacy.subjectaltname ?? cert.subjectAltName)
  const signature = cert as X509Certificate & { signatureAlgorithm?: string; signatureAlgorithmOid?: string }

  return {
    subject: {
      commonName: subject.CN ?? '',
      organization: subject.O ?? '',
      organizationalUnit: subject.OU ?? '',
      country: subject.C ?? '',
      state: subject.ST ?? '',
      locality: subject.L ?? '',
    },
    issuer: { commonName: issuer.CN ?? '', organization: issuer.O ?? '', country: issuer.C ?? '' },
    serialNumber: cert.serialNumber,
    validFrom: validFrom.toISOString().split('T')[0],
    validTo: validTo.toISOString().split('T')[0],
    daysRemaining,
    publicKey: cryptoPublicKeyInfo(cert),
    signatureAlgorithm: signature.signatureAlgorithm ?? signature.signatureAlgorithmOid ?? 'Unknown',
    sans,
    domainType: classifyDomainType(subject.CN ?? '', sans),
    keyUsage: Array.isArray(cert.keyUsage) ? cert.keyUsage : [],
    extKeyUsage: legacy.ext_key_usage ?? [],
    fingerprintSha1: cert.fingerprint,
    fingerprintSha256: cert.fingerprint256,
    pemRaw: pemFromRaw(cert.raw),
  }
}

function decodeCertWithForge(pemOrDer: string): CertInfo {
  let cert: forge.pki.Certificate
  const trimmed = pemOrDer.trim()
  if (trimmed.startsWith('-----BEGIN CERTIFICATE-----')) {
    cert = forge.pki.certificateFromPem(trimmed)
  } else {
    const der = forge.util.decode64(trimmed)
    cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(der))
  }

  const now = Date.now()
  const validTo = cert.validity.notAfter
  const daysRemaining = Math.floor((validTo.getTime() - now) / (1000 * 60 * 60 * 24))

  const sans: string[] = []
  try {
    const sanExt = cert.getExtension('subjectAltName') as { altNames?: { type: number; value: string }[] } | null
    if (sanExt?.altNames) sans.push(...sanExt.altNames.filter(a => a.type === 2).map(a => a.value))
  } catch {}

  const keyUsage: string[] = []
  try {
    const ku = cert.getExtension('keyUsage') as Record<string, boolean> | null
    if (ku) {
      if (ku.digitalSignature) keyUsage.push('Digital Signature')
      if (ku.keyEncipherment) keyUsage.push('Key Encipherment')
      if (ku.keyCertSign) keyUsage.push('Certificate Sign')
    }
  } catch {}

  const extKeyUsage: string[] = []
  try {
    const eku = cert.getExtension('extKeyUsage') as Record<string, boolean> | null
    if (eku) {
      if (eku.serverAuth) extKeyUsage.push('TLS Web Server Auth')
      if (eku.clientAuth) extKeyUsage.push('TLS Web Client Auth')
    }
  } catch {}

  const pubKey = cert.publicKey as forge.pki.rsa.PublicKey
  const commonName = getField(cert.subject, 'CN')
  return {
    subject: { commonName, organization: getField(cert.subject, 'O'), organizationalUnit: getField(cert.subject, 'OU'), country: getField(cert.subject, 'C'), state: getField(cert.subject, 'ST'), locality: getField(cert.subject, 'L') },
    issuer: { commonName: getField(cert.issuer, 'CN'), organization: getField(cert.issuer, 'O'), country: getField(cert.issuer, 'C') },
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore.toISOString().split('T')[0],
    validTo: validTo.toISOString().split('T')[0],
    daysRemaining,
    publicKey: { algorithm: 'RSA', bits: pubKey.n?.bitLength() ?? 0 },
    signatureAlgorithm: cert.siginfo.algorithmOid,
    sans,
    domainType: classifyDomainType(commonName, sans),
    keyUsage,
    extKeyUsage,
    fingerprintSha1: fingerprint(cert, 'sha1'),
    fingerprintSha256: fingerprint(cert, 'sha256'),
    pemRaw: forge.pki.certificateToPem(cert),
  }
}

export function decodeCert(pemOrDer: string): CertInfo {
  try {
    return decodeCertWithForge(pemOrDer)
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('OID is not RSA')) throw error
    return decodeCertWithCrypto(pemOrDer)
  }
}
