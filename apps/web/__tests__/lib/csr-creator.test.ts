import { execFileSync } from 'child_process'
import { createPrivateKey, generateKeyPairSync } from 'crypto'
import { createCsr } from '@/lib/csr-creator'

function opensslReqText(csrPem: string): string {
  return execFileSync('openssl', ['req', '-noout', '-subject', '-text'], {
    input: csrPem,
    encoding: 'utf8',
  })
}

describe('createCsr', () => {
  it('generates a CSR and unencrypted ECDSA P-384 private key by default', () => {
    const result = createCsr({
      commonName: 'secure.example.com',
      sans: ['secure.example.com', 'www.secure.example.com'],
    })

    expect(result.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(result.privateKeyPem).not.toContain('ENCRYPTED')
    expect(result.keyAlgorithm).toBe('ECDSA P-384')

    const text = opensslReqText(result.csrPem)
    expect(text).toContain('CN=secure.example.com')
    expect(text).toContain('Public Key Algorithm: id-ecPublicKey')
    expect(text).toContain('ASN1 OID: secp384r1')
    expect(text).toContain('DNS:secure.example.com')
    expect(text).toContain('DNS:www.secure.example.com')
  })

  it('can generate an encrypted RSA 4096 private key', () => {
    const result = createCsr({
      commonName: 'rsa.example.com',
      keyAlgorithm: 'rsa-4096',
      encryptPrivateKey: true,
      privateKeyPassword: 'correct horse battery staple',
    })

    expect(result.privateKeyPem).toContain('-----BEGIN ENCRYPTED PRIVATE KEY-----')
    expect(result.keyAlgorithm).toBe('RSA 4096')

    const key = createPrivateKey({
      key: result.privateKeyPem!,
      format: 'pem',
      passphrase: 'correct horse battery staple',
    })
    expect(key.asymmetricKeyType).toBe('rsa')
    expect(key.asymmetricKeyDetails?.modulusLength).toBe(4096)

    const text = opensslReqText(result.csrPem)
    expect(text).toContain('CN=rsa.example.com')
    expect(text).toContain('Public Key Algorithm: rsaEncryption')
  })

  it('creates a CSR from an uploaded private key without returning a new private key', () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    })

    const result = createCsr({
      commonName: 'uploaded-key.example.com',
      existingPrivateKeyPem: privateKey,
    })

    expect(result.privateKeyPem).toBeUndefined()
    expect(result.keyAlgorithm).toBe('RSA 2048')

    const text = opensslReqText(result.csrPem)
    expect(text).toContain('CN=uploaded-key.example.com')
    expect(text).toContain('Public Key Algorithm: rsaEncryption')
  })
})
