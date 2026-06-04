import forge from 'node-forge'

export interface CsrInfo {
  commonName: string
  organization: string
  organizationalUnit: string
  country: string
  state: string
  locality: string
  email: string
  publicKeyAlgorithm: string
  publicKeyBits: number
  signatureAlgorithm: string
  sans: string[]
}

function getAttr(csr: ReturnType<typeof forge.pki.certificationRequestFromPem>, name: string): string {
  const attr = csr.subject.getField(name)
  return attr ? (attr.value as string) : ''
}

export function decodeCsr(pem: string): CsrInfo {
  const csr = forge.pki.certificationRequestFromPem(pem)
  const pubKey = csr.publicKey as forge.pki.rsa.PublicKey
  const bits = pubKey.n?.bitLength() ?? 0
  const sans: string[] = []

  try {
    const ext = csr.getAttribute({ name: 'extensionRequest' })
    if (ext && ext.extensions) {
      const sanExt = ext.extensions.find((e: { name: string }) => e.name === 'subjectAltName') as { altNames?: { type: number; value: string }[] } | undefined
      if (sanExt?.altNames) {
        sans.push(...sanExt.altNames.filter(a => a.type === 2).map(a => a.value))
      }
    }
  } catch {}

  return {
    commonName: getAttr(csr, 'CN'),
    organization: getAttr(csr, 'O'),
    organizationalUnit: getAttr(csr, 'OU'),
    country: getAttr(csr, 'C'),
    state: getAttr(csr, 'ST'),
    locality: getAttr(csr, 'L'),
    email: getAttr(csr, 'emailAddress'),
    publicKeyAlgorithm: 'RSA',
    publicKeyBits: bits,
    signatureAlgorithm: csr.md?.algorithm ?? 'sha256WithRSAEncryption',
    sans,
  }
}
