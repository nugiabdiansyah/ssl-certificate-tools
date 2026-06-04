import forge from 'node-forge'

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

export function decodeCert(pemOrDer: string): CertInfo {
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
  return {
    subject: { commonName: getField(cert.subject, 'CN'), organization: getField(cert.subject, 'O'), organizationalUnit: getField(cert.subject, 'OU'), country: getField(cert.subject, 'C'), state: getField(cert.subject, 'ST'), locality: getField(cert.subject, 'L') },
    issuer: { commonName: getField(cert.issuer, 'CN'), organization: getField(cert.issuer, 'O'), country: getField(cert.issuer, 'C') },
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore.toISOString().split('T')[0],
    validTo: validTo.toISOString().split('T')[0],
    daysRemaining,
    publicKey: { algorithm: 'RSA', bits: pubKey.n?.bitLength() ?? 0 },
    signatureAlgorithm: cert.siginfo.algorithmOid,
    sans,
    keyUsage,
    extKeyUsage,
    fingerprintSha1: fingerprint(cert, 'sha1'),
    fingerprintSha256: fingerprint(cert, 'sha256'),
    pemRaw: forge.pki.certificateToPem(cert),
  }
}
