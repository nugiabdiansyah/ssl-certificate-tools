import forge from 'node-forge'

export type CertFormat = 'pem' | 'der' | 'p7b' | 'pfx'

export interface ConvertResult {
  data: Buffer
  filename: string
  mimeType: string
}

// ─── Internal parsers ──────────────────────────────────────────────────────

function parsePemCert(pem: string): forge.pki.Certificate {
  return forge.pki.certificateFromPem(pem)
}

function parseDerCert(data: Buffer): forge.pki.Certificate {
  const asn1 = forge.asn1.fromDer(data.toString('binary'))
  return forge.pki.certificateFromAsn1(asn1)
}

function parseP7bCerts(p7b: string): forge.pki.Certificate[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = forge.pkcs7.messageFromPem(p7b) as any
    const certs: forge.pki.Certificate[] = msg.certificates ?? []
    return certs
  } catch {
    // Fallback: single PEM cert mislabeled as P7B
    return [parsePemCert(p7b)]
  }
}

function parsePfx(
  data: Buffer,
  passphrase: string,
): { cert: forge.pki.Certificate; key?: forge.pki.PrivateKey } {
  const p12Asn1 = forge.asn1.fromDer(data.toString('binary'))
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag }) as any
  const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert as forge.pki.Certificate | undefined
  if (!cert) throw new Error('No certificate found in PFX/P12 file')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag }) as any
  const key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key as forge.pki.PrivateKey | undefined

  return { cert, key }
}

// ─── Internal serialisers ──────────────────────────────────────────────────

function certToDerBuffer(cert: forge.pki.Certificate): Buffer {
  const asn1 = forge.pki.certificateToAsn1(cert)
  return Buffer.from(forge.asn1.toDer(asn1).getBytes(), 'binary')
}

function certsToP7bPem(certs: forge.pki.Certificate[]): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = forge.pkcs7.createSignedData() as any
  msg.content = forge.util.createBuffer()
  certs.forEach(c => msg.addCertificate(c))
  return forge.pkcs7.messageToPem(msg)
}

function toPfxBuffer(
  cert: forge.pki.Certificate,
  key: forge.pki.PrivateKey,
  passphrase: string,
  legacy = false,
): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(key as any, [cert], passphrase, {
    algorithm: legacy ? '3des' : 'aes256',
  })
  return Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary')
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Parse multiple PEM certs from a bundle/chain string. */
export function parsePemChain(pemChain: string): forge.pki.Certificate[] {
  const certs: forge.pki.Certificate[] = []
  const re = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g
  for (const match of pemChain.match(re) ?? []) {
    try { certs.push(forge.pki.certificateFromPem(match)) } catch { /* skip invalid */ }
  }
  return certs
}

// ─── Public API ────────────────────────────────────────────────────────────

export function convertCert(
  certData: string | Buffer,
  fromFormat: CertFormat,
  toFormat: CertFormat,
  privateKeyPem?: string,
  passphrase?: string,
  legacy = false,
): ConvertResult {
  // Step 1: parse source into certificate(s)
  let certs: forge.pki.Certificate[] = []
  let pfxKey: forge.pki.PrivateKey | undefined

  switch (fromFormat) {
    case 'pem':
      certs = [parsePemCert(certData as string)]
      break
    case 'der':
      certs = [parseDerCert(certData as Buffer)]
      break
    case 'p7b':
      certs = parseP7bCerts(certData as string)
      if (certs.length === 0) throw new Error('No certificates found in P7B file')
      break
    case 'pfx': {
      const parsed = parsePfx(certData as Buffer, passphrase ?? '')
      certs = [parsed.cert]
      pfxKey = parsed.key
      break
    }
  }

  const leaf = certs[0]

  // Step 2: serialise to target format
  switch (toFormat) {
    case 'pem': {
      const pem = certs.map(c => forge.pki.certificateToPem(c)).join('\n')
      return { data: Buffer.from(pem, 'utf8'), filename: 'certificate.pem', mimeType: 'application/x-pem-file' }
    }
    case 'der': {
      return { data: certToDerBuffer(leaf), filename: 'certificate.der', mimeType: 'application/x-x509-ca-cert' }
    }
    case 'p7b': {
      const p7b = certsToP7bPem(certs)
      return { data: Buffer.from(p7b, 'utf8'), filename: 'certificate.p7b', mimeType: 'application/x-pkcs7-certificates' }
    }
    case 'pfx': {
      const key = privateKeyPem ? forge.pki.privateKeyFromPem(privateKeyPem) : pfxKey
      if (!key) throw new Error('Private key is required for PFX/P12 output')
      const pfx = toPfxBuffer(leaf, key, passphrase ?? '', legacy)
      return { data: pfx, filename: 'certificate.pfx', mimeType: 'application/x-pkcs12' }
    }
    default:
      throw new Error(`Unsupported target format: ${toFormat}`)
  }
}

/**
 * Build a full-chain PEM bundle: leaf cert + CA chain + (optionally) private key.
 * Server-side version that validates each PEM block before concatenating.
 */
export function buildPemBundle(
  certPem: string,
  caBundlePem: string,
  privateKeyPem?: string,
): ConvertResult {
  const parts: string[] = []

  // Private key first (commercial.key)
  if (privateKeyPem?.trim()) {
    const key = forge.pki.privateKeyFromPem(privateKeyPem.trim())
    parts.push(forge.pki.privateKeyToPem(key).trim())
  }

  // Leaf cert
  const leaf = parsePemCert(certPem.trim())
  parts.push(forge.pki.certificateToPem(leaf).trim())

  // CA chain: intermediate → rootca
  const chain = parsePemChain(caBundlePem)
  if (chain.length === 0) throw new Error('CA bundle contains no valid certificates')
  chain.forEach(c => parts.push(forge.pki.certificateToPem(c).trim()))

  const pem = parts.join('\n\n') + '\n'
  return { data: Buffer.from(pem, 'utf8'), filename: 'fullchain.pem', mimeType: 'application/x-pem-file' }
}

/**
 * Decrypt an encrypted private key (remove passphrase), or encrypt an
 * unencrypted key (add passphrase).
 */
export function convertPrivateKey(
  keyPem: string,
  action: 'decrypt' | 'encrypt',
  passphrase: string,
): ConvertResult {
  if (action === 'decrypt') {
    const key = forge.pki.decryptRsaPrivateKey(keyPem, passphrase)
    if (!key) throw new Error('Gagal decrypt key — passphrase salah atau format tidak didukung')
    const pem = forge.pki.privateKeyToPem(key)
    return { data: Buffer.from(pem, 'utf8'), filename: 'private.key', mimeType: 'application/x-pem-file' }
  } else {
    const key = forge.pki.privateKeyFromPem(keyPem)
    const pem = forge.pki.encryptRsaPrivateKey(key, passphrase, { algorithm: 'aes256' as unknown as forge.pki.EncryptionOptions['algorithm'] })
    return { data: Buffer.from(pem, 'utf8'), filename: 'private_encrypted.key', mimeType: 'application/x-pem-file' }
  }
}

/**
 * Build a PKCS#12 keystore suitable for Tomcat — includes the full cert chain.
 * Tomcat 8.5+ accepts PKCS#12 natively (keystoreType="PKCS12").
 * For legacy JKS, convert the resulting file with keytool.
 */
export function buildTomcatKeystore(
  certPem: string,
  caBundlePem: string,
  privateKeyPem: string,
  passphrase: string,
  legacy = false,
): ConvertResult {
  const leaf = parsePemCert(certPem.trim())
  const chain = parsePemChain(caBundlePem)
  const key = forge.pki.privateKeyFromPem(privateKeyPem.trim())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(key as any, [leaf, ...chain], passphrase, {
    algorithm: legacy ? '3des' : 'aes256',
    friendlyName: 'tomcat',
  })
  const data = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary')
  return { data, filename: 'keystore.p12', mimeType: 'application/x-pkcs12' }
}
