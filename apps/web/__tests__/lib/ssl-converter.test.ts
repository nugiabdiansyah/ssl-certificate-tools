import { createPrivateKey, generateKeyPairSync } from 'crypto'
import { convertCert, convertPrivateKey, detectFormat } from '@/lib/ssl-converter'
import { fixtures } from '../fixtures'

describe('detectFormat', () => {
  it('detects PEM format', () => {
    expect(detectFormat(fixtures.certPem)).toBe('pem')
  })
})

describe('convertCert', () => {
  it('converts PEM to DER (returns Buffer)', () => {
    const result = convertCert(fixtures.certPem, 'pem', 'der')
    expect(result.data).toBeInstanceOf(Buffer)
    expect(result.filename).toMatch(/\.der$/)
  })
  it('converts PEM to PEM (round-trip)', () => {
    const result = convertCert(fixtures.certPem, 'pem', 'pem')
    expect(result.data.toString()).toContain('BEGIN CERTIFICATE')
  })
})

describe('convertPrivateKey', () => {
  it('encrypts and decrypts an ECDSA private key', () => {
    const { privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'secp384r1',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    })

    const encrypted = convertPrivateKey(privateKey, 'encrypt', 'secret-passphrase')
    expect(encrypted.data.toString()).toContain('BEGIN ENCRYPTED PRIVATE KEY')

    const decrypted = convertPrivateKey(encrypted.data.toString(), 'decrypt', 'secret-passphrase')
    const parsed = createPrivateKey(decrypted.data.toString())

    expect(parsed.asymmetricKeyType).toBe('ec')
    expect(parsed.asymmetricKeyDetails?.namedCurve).toBe('secp384r1')
  })
})
