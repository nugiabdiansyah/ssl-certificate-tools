import forge from 'node-forge'

export interface KeyMatchResult {
  match: boolean
  certCommonName: string
  keyType: string
  explanation: string
}

export function matchKeyToCert(certPem: string, keyPem: string): KeyMatchResult {
  const cert = forge.pki.certificateFromPem(certPem)
  const privateKey = forge.pki.privateKeyFromPem(keyPem) as forge.pki.rsa.PrivateKey
  const certPublicKey = cert.publicKey as forge.pki.rsa.PublicKey

  const certModulus = certPublicKey.n.toString(16)
  const keyModulus = privateKey.n.toString(16)
  const match = certModulus === keyModulus

  const cn = (cert.subject.getField('CN')?.value as string) ?? 'Unknown'

  return {
    match,
    certCommonName: cn,
    keyType: `RSA ${certPublicKey.n.bitLength()}-bit`,
    explanation: match
      ? `The private key matches the public key in certificate "${cn}".`
      : `The private key does NOT match certificate "${cn}". They have different public keys.`,
  }
}
