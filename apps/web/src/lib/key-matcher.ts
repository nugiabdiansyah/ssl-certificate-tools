import { createPrivateKey, createPublicKey, X509Certificate } from 'crypto'

export interface KeyMatchResult {
  match: boolean
  certCommonName: string
  keyType: string
  explanation: string
}

function commonName(cert: X509Certificate): string {
  const legacy = cert.toLegacyObject() as { subject?: { CN?: string } }
  if (legacy.subject?.CN) return legacy.subject.CN

  const match = cert.subject.match(/(?:^|\n)CN=([^\n]+)/)
  return match?.[1] ?? 'Unknown'
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

function keyLabel(key: X509Certificate['publicKey']): string {
  const details = key.asymmetricKeyDetails as { modulusLength?: number; namedCurve?: string } | undefined

  if (key.asymmetricKeyType === 'rsa' || key.asymmetricKeyType === 'rsa-pss') {
    return `RSA ${details?.modulusLength ?? 0}-bit`
  }
  if (key.asymmetricKeyType === 'ec') {
    return `ECDSA P-${curveBits(details?.namedCurve)}`
  }
  if (key.asymmetricKeyType === 'ed25519') return 'Ed25519'
  if (key.asymmetricKeyType === 'ed448') return 'Ed448'

  return key.asymmetricKeyType ?? 'Unknown'
}

export function matchKeyToCert(certPem: string, keyPem: string): KeyMatchResult {
  const cert = new X509Certificate(certPem)
  const privateKey = createPrivateKey(keyPem)
  const privatePublicKey = createPublicKey(privateKey)

  const certSpki = cert.publicKey.export({ type: 'spki', format: 'der' })
  const keySpki = privatePublicKey.export({ type: 'spki', format: 'der' })
  const match = Buffer.from(certSpki).equals(Buffer.from(keySpki))
  const cn = commonName(cert)

  return {
    match,
    certCommonName: cn,
    keyType: keyLabel(cert.publicKey),
    explanation: match
      ? `The private key matches the public key in certificate "${cn}".`
      : `The private key does NOT match certificate "${cn}". They have different public keys.`,
  }
}
