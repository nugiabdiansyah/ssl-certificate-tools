import { createPrivateKey, createPublicKey, createSign, generateKeyPairSync, KeyObject } from 'crypto'

export type CsrKeyAlgorithm = 'rsa-2048' | 'rsa-4096' | 'ecdsa-p256' | 'ecdsa-p384' | 'ecdsa-p521'

export interface CreateCsrInput {
  commonName: string
  organization?: string
  organizationalUnit?: string
  country?: string
  state?: string
  locality?: string
  email?: string
  sans?: string[]
  keyAlgorithm?: CsrKeyAlgorithm
  encryptPrivateKey?: boolean
  privateKeyPassword?: string
  existingPrivateKeyPem?: string
}

export interface CreateCsrResult {
  csrPem: string
  privateKeyPem?: string
  keyAlgorithm: string
  signatureAlgorithm: string
}

const DEFAULT_ALGORITHM: CsrKeyAlgorithm = 'ecdsa-p384'

const OIDS = {
  commonName: '2.5.4.3',
  country: '2.5.4.6',
  locality: '2.5.4.7',
  state: '2.5.4.8',
  organization: '2.5.4.10',
  organizationalUnit: '2.5.4.11',
  email: '1.2.840.113549.1.9.1',
  extensionRequest: '1.2.840.113549.1.9.14',
  subjectAltName: '2.5.29.17',
  sha256WithRSA: '1.2.840.113549.1.1.11',
  ecdsaWithSha256: '1.2.840.10045.4.3.2',
  ecdsaWithSha384: '1.2.840.10045.4.3.3',
  ecdsaWithSha512: '1.2.840.10045.4.3.4',
}

function derLength(length: number): Buffer {
  if (length < 128) return Buffer.from([length])
  const bytes: number[] = []
  let value = length
  while (value > 0) {
    bytes.unshift(value & 0xff)
    value >>= 8
  }
  return Buffer.from([0x80 | bytes.length, ...bytes])
}

function der(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLength(content.length), content])
}

function seq(...items: Buffer[]): Buffer {
  return der(0x30, Buffer.concat(items))
}

function set(...items: Buffer[]): Buffer {
  return der(0x31, Buffer.concat(items))
}

function integer(value: number): Buffer {
  return der(0x02, Buffer.from([value]))
}

function oid(value: string): Buffer {
  const parts = value.split('.').map(Number)
  const bytes = [parts[0] * 40 + parts[1]]
  for (const part of parts.slice(2)) {
    const stack = [part & 0x7f]
    let next = part >> 7
    while (next > 0) {
      stack.unshift((next & 0x7f) | 0x80)
      next >>= 7
    }
    bytes.push(...stack)
  }
  return der(0x06, Buffer.from(bytes))
}

function nullValue(): Buffer {
  return Buffer.from([0x05, 0x00])
}

function utf8(value: string): Buffer {
  return der(0x0c, Buffer.from(value, 'utf8'))
}

function printable(value: string): Buffer {
  return der(0x13, Buffer.from(value, 'ascii'))
}

function ia5(value: string): Buffer {
  return der(0x16, Buffer.from(value, 'ascii'))
}

function bitString(value: Buffer): Buffer {
  return der(0x03, Buffer.concat([Buffer.from([0x00]), value]))
}

function octetString(value: Buffer): Buffer {
  return der(0x04, value)
}

function pem(label: string, derBytes: Buffer): string {
  const body = derBytes.toString('base64').match(/.{1,64}/g)?.join('\n') ?? ''
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`
}

function attribute(oidValue: string, value: Buffer): Buffer {
  return set(seq(oid(oidValue), value))
}

function subjectName(input: CreateCsrInput): Buffer {
  const fields: Array<[string, string | undefined, 'utf8' | 'printable' | 'ia5']> = [
    [OIDS.country, input.country, 'printable'],
    [OIDS.state, input.state, 'utf8'],
    [OIDS.locality, input.locality, 'utf8'],
    [OIDS.organization, input.organization, 'utf8'],
    [OIDS.organizationalUnit, input.organizationalUnit, 'utf8'],
    [OIDS.commonName, input.commonName, 'utf8'],
    [OIDS.email, input.email, 'ia5'],
  ]

  return seq(...fields
    .filter(([, value]) => value?.trim())
    .map(([fieldOid, value, type]) => {
      const encoded = type === 'printable' ? printable(value!.trim()) : type === 'ia5' ? ia5(value!.trim()) : utf8(value!.trim())
      return attribute(fieldOid, encoded)
    }))
}

function subjectAltNameExtension(sans: string[] = []): Buffer | null {
  const names = [...new Set(sans.map(name => name.trim()).filter(Boolean))]
  if (names.length === 0) return null
  const generalNames = seq(...names.map(name => der(0x82, Buffer.from(name, 'ascii'))))
  const extension = seq(oid(OIDS.subjectAltName), octetString(generalNames))
  const extensions = seq(extension)
  return seq(oid(OIDS.extensionRequest), set(extensions))
}

function attributes(input: CreateCsrInput): Buffer {
  const san = subjectAltNameExtension(input.sans)
  return der(0xa0, san ? san : Buffer.alloc(0))
}

function keyPairForAlgorithm(algorithm: CsrKeyAlgorithm): { privateKey: KeyObject; publicKey: KeyObject } {
  if (algorithm === 'rsa-2048' || algorithm === 'rsa-4096') {
    return generateKeyPairSync('rsa', { modulusLength: algorithm === 'rsa-4096' ? 4096 : 2048 })
  }

  const namedCurve = {
    'ecdsa-p256': 'prime256v1',
    'ecdsa-p384': 'secp384r1',
    'ecdsa-p521': 'secp521r1',
  }[algorithm]
  return generateKeyPairSync('ec', { namedCurve })
}

function privateKeyToPem(privateKey: KeyObject, encrypt: boolean, passphrase?: string): string {
  if (!encrypt) {
    return privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  }
  if (!passphrase) throw new Error('Private key password is required when encryption is enabled')
  return privateKey.export({
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase,
  }).toString()
}

function keyLabel(key: KeyObject): string {
  if (key.asymmetricKeyType === 'rsa' || key.asymmetricKeyType === 'rsa-pss') {
    return `RSA ${key.asymmetricKeyDetails?.modulusLength ?? 0}`
  }

  if (key.asymmetricKeyType === 'ec') {
    const curve = key.asymmetricKeyDetails?.namedCurve
    const bits = curve === 'prime256v1' ? 256 : curve === 'secp384r1' ? 384 : curve === 'secp521r1' ? 521 : 0
    return `ECDSA P-${bits}`
  }

  return key.asymmetricKeyType ?? 'Unknown'
}

function signatureConfig(key: KeyObject): { digest: string; algorithmIdentifier: Buffer; label: string } {
  if (key.asymmetricKeyType === 'rsa' || key.asymmetricKeyType === 'rsa-pss') {
    return { digest: 'sha256', algorithmIdentifier: seq(oid(OIDS.sha256WithRSA), nullValue()), label: 'sha256WithRSAEncryption' }
  }

  const curve = key.asymmetricKeyDetails?.namedCurve
  if (curve === 'secp521r1') {
    return { digest: 'sha512', algorithmIdentifier: seq(oid(OIDS.ecdsaWithSha512)), label: 'ecdsa-with-SHA512' }
  }
  if (curve === 'secp384r1') {
    return { digest: 'sha384', algorithmIdentifier: seq(oid(OIDS.ecdsaWithSha384)), label: 'ecdsa-with-SHA384' }
  }
  return { digest: 'sha256', algorithmIdentifier: seq(oid(OIDS.ecdsaWithSha256)), label: 'ecdsa-with-SHA256' }
}

export function createCsr(input: CreateCsrInput): CreateCsrResult {
  if (!input.commonName.trim()) throw new Error('Common Name is required')

  const generated = !input.existingPrivateKeyPem
  const privateKey = generated
    ? keyPairForAlgorithm(input.keyAlgorithm ?? DEFAULT_ALGORITHM).privateKey
    : createPrivateKey({ key: input.existingPrivateKeyPem!, format: 'pem', passphrase: input.privateKeyPassword || undefined })
  const publicKey = generated
    ? createPublicKey(privateKey)
    : createPublicKey(privateKey)
  const spki = publicKey.export({ type: 'spki', format: 'der' }) as Buffer

  const certificationRequestInfo = seq(
    integer(0),
    subjectName(input),
    spki,
    attributes(input),
  )
  const signature = createSign(signatureConfig(privateKey).digest).update(certificationRequestInfo).sign(privateKey)
  const signatureAlgorithm = signatureConfig(privateKey)
  const csrDer = seq(certificationRequestInfo, signatureAlgorithm.algorithmIdentifier, bitString(signature))

  return {
    csrPem: pem('CERTIFICATE REQUEST', csrDer),
    privateKeyPem: generated ? privateKeyToPem(privateKey, input.encryptPrivateKey ?? false, input.privateKeyPassword) : undefined,
    keyAlgorithm: keyLabel(privateKey),
    signatureAlgorithm: signatureAlgorithm.label,
  }
}
