import forge from 'node-forge'

export type CertFormat = 'pem' | 'der' | 'pfx'

export interface ConvertResult {
  data: Buffer
  filename: string
  mimeType: string
}

export function detectFormat(input: string): CertFormat {
  const trimmed = input.trim()
  if (trimmed.startsWith('-----BEGIN')) return 'pem'
  return 'der'
}

export function convertCert(
  certInput: string,
  targetFormat: CertFormat,
  privateKeyPem?: string,
  passphrase?: string,
): ConvertResult {
  const sourceFormat = detectFormat(certInput)
  let cert: forge.pki.Certificate

  if (sourceFormat === 'pem') {
    cert = forge.pki.certificateFromPem(certInput)
  } else {
    const der = Buffer.from(certInput, 'base64')
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(der))
    cert = forge.pki.certificateFromAsn1(asn1)
  }

  if (targetFormat === 'pem') {
    const pem = forge.pki.certificateToPem(cert)
    return { data: Buffer.from(pem, 'utf8'), filename: 'certificate.pem', mimeType: 'application/x-pem-file' }
  }

  if (targetFormat === 'der') {
    const asn1 = forge.pki.certificateToAsn1(cert)
    const der = forge.asn1.toDer(asn1).getBytes()
    return { data: Buffer.from(der, 'binary'), filename: 'certificate.der', mimeType: 'application/x-x509-ca-cert' }
  }

  if (targetFormat === 'pfx') {
    if (!privateKeyPem) throw new Error('Private key is required for PFX conversion')
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], passphrase ?? '', { algorithm: '3des' })
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes()
    return { data: Buffer.from(p12Der, 'binary'), filename: 'certificate.pfx', mimeType: 'application/x-pkcs12' }
  }

  throw new Error(`Unsupported format: ${targetFormat}`)
}
