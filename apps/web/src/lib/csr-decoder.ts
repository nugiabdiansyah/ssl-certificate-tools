import forge from 'node-forge'
import { createPublicKey } from 'crypto'
import { classifyDomainType, type DomainType } from './domain-classifier'

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
  domainType: DomainType
}

function getAttr(csr: ReturnType<typeof forge.pki.certificationRequestFromPem>, name: string): string {
  const attr = csr.subject.getField(name)
  return attr ? (attr.value as string) : ''
}

const NAME_OIDS: Record<string, keyof Pick<CsrInfo, 'commonName' | 'organization' | 'organizationalUnit' | 'country' | 'state' | 'locality' | 'email'>> = {
  '2.5.4.3': 'commonName',
  '2.5.4.10': 'organization',
  '2.5.4.11': 'organizationalUnit',
  '2.5.4.6': 'country',
  '2.5.4.8': 'state',
  '2.5.4.7': 'locality',
  '1.2.840.113549.1.9.1': 'email',
}

const SIGNATURE_OIDS: Record<string, string> = {
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
  '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',
}

type Asn1 = forge.asn1.Asn1

function pemToDer(pem: string): Buffer {
  const match = pem.match(/-----BEGIN (?:NEW )?CERTIFICATE REQUEST-----([\s\S]+?)-----END (?:NEW )?CERTIFICATE REQUEST-----/)
  if (!match) throw new Error('Invalid CSR PEM format')
  return Buffer.from(match[1].replace(/\s+/g, ''), 'base64')
}

function asn1Value(node: Asn1): Asn1[] {
  return Array.isArray(node.value) ? node.value as Asn1[] : []
}

function oidValue(node: Asn1): string {
  return forge.asn1.derToOid(node.value as string)
}

function stringValue(node: Asn1): string {
  const value = node.value as string
  if (node.type === forge.asn1.Type.UTF8) {
    return forge.util.decodeUtf8(value)
  }
  return value
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

function publicKeyInfo(spkiDer: Buffer): Pick<CsrInfo, 'publicKeyAlgorithm' | 'publicKeyBits'> {
  const key = createPublicKey({ key: spkiDer, format: 'der', type: 'spki' })
  const details = key.asymmetricKeyDetails as { modulusLength?: number; namedCurve?: string } | undefined

  if (key.asymmetricKeyType === 'rsa' || key.asymmetricKeyType === 'rsa-pss') {
    return { publicKeyAlgorithm: 'RSA', publicKeyBits: details?.modulusLength ?? 0 }
  }
  if (key.asymmetricKeyType === 'ec') {
    return { publicKeyAlgorithm: 'ECDSA', publicKeyBits: curveBits(details?.namedCurve) }
  }
  if (key.asymmetricKeyType === 'ed25519') return { publicKeyAlgorithm: 'Ed25519', publicKeyBits: 256 }
  if (key.asymmetricKeyType === 'ed448') return { publicKeyAlgorithm: 'Ed448', publicKeyBits: 456 }

  return { publicKeyAlgorithm: key.asymmetricKeyType ?? 'Unknown', publicKeyBits: 0 }
}

function parseSubject(subject: Asn1): Pick<CsrInfo, 'commonName' | 'organization' | 'organizationalUnit' | 'country' | 'state' | 'locality' | 'email'> {
  const result = {
    commonName: '',
    organization: '',
    organizationalUnit: '',
    country: '',
    state: '',
    locality: '',
    email: '',
  }

  for (const rdn of asn1Value(subject)) {
    for (const attr of asn1Value(rdn)) {
      const [oidNode, valueNode] = asn1Value(attr)
      if (!oidNode || !valueNode) continue
      const field = NAME_OIDS[oidValue(oidNode)]
      if (field) result[field] = stringValue(valueNode)
    }
  }

  return result
}

function parseDnsSans(generalNames: Asn1): string[] {
  return asn1Value(generalNames)
    .filter(name => name.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && name.type === 2)
    .map(name => name.value as string)
}

function parseExtensionsFromAttribute(attributeNode: Asn1): string[] {
  const [oidNode, valuesNode] = asn1Value(attributeNode)
  if (!oidNode || !valuesNode || oidValue(oidNode) !== '1.2.840.113549.1.9.14') return []

  const extensions = asn1Value(asn1Value(valuesNode)[0])
  const sans: string[] = []
  for (const extension of extensions) {
    const parts = asn1Value(extension)
    const extOid = oidValue(parts[0])
    const extValue = parts.at(-1)
    if (extOid !== '2.5.29.17' || !extValue) continue

    const generalNames = forge.asn1.fromDer(extValue.value as string)
    sans.push(...parseDnsSans(generalNames))
  }
  return sans
}

function parseSansFromAttributes(attributesNode: Asn1): string[] {
  return asn1Value(attributesNode).flatMap(parseExtensionsFromAttribute)
}

function decodeCsrWithAsn1(pem: string): CsrInfo {
  const csrDer = pemToDer(pem)
  const csr = forge.asn1.fromDer(csrDer.toString('binary'))
  const [requestInfo, signatureAlgorithmNode] = asn1Value(csr)
  const [, subjectNode, spkiNode, attributesNode] = asn1Value(requestInfo)
  const subject = parseSubject(subjectNode)
  const sans = attributesNode ? parseSansFromAttributes(attributesNode) : []
  const spkiDer = Buffer.from(forge.asn1.toDer(spkiNode).getBytes(), 'binary')
  const [signatureOidNode] = asn1Value(signatureAlgorithmNode)
  const signatureOid = signatureOidNode ? oidValue(signatureOidNode) : ''

  return {
    ...subject,
    ...publicKeyInfo(spkiDer),
    signatureAlgorithm: SIGNATURE_OIDS[signatureOid] ?? signatureOid,
    sans,
    domainType: classifyDomainType(subject.commonName, sans),
  }
}

export function decodeCsr(pem: string): CsrInfo {
  let csr: ReturnType<typeof forge.pki.certificationRequestFromPem>
  try {
    csr = forge.pki.certificationRequestFromPem(pem)
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('OID is not RSA')) throw error
    return decodeCsrWithAsn1(pem)
  }
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
    domainType: classifyDomainType(getAttr(csr, 'CN'), sans),
  }
}
