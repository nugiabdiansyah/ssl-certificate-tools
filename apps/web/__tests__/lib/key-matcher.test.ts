import { matchKeyToCert } from '@/lib/key-matcher'
import { fixtures } from '../fixtures'
import forge from 'node-forge'
import { execFileSync } from 'child_process'
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('matchKeyToCert', () => {
  it('returns match=true for correct pair', () => {
    const result = matchKeyToCert(fixtures.certPem, fixtures.privateKeyPem)
    expect(result.match).toBe(true)
  })
  it('returns match=false for wrong key', () => {
    const wrongKey = forge.pki.privateKeyToPem(fixtures.otherKeys.privateKey)
    const result = matchKeyToCert(fixtures.certPem, wrongKey)
    expect(result.match).toBe(false)
  })
  it('throws on invalid cert', () => {
    expect(() => matchKeyToCert('bad cert', fixtures.privateKeyPem)).toThrow()
  })
  it('matches an ECDSA certificate and private key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ssl-tools-ec-'))
    const keyPath = join(dir, 'ec.key')
    const certPath = join(dir, 'ec.crt')

    execFileSync('openssl', ['ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', keyPath])
    execFileSync('openssl', [
      'req',
      '-new',
      '-x509',
      '-key',
      keyPath,
      '-out',
      certPath,
      '-days',
      '1',
      '-subj',
      '/CN=ecdsa.example.com',
    ])

    const result = matchKeyToCert(readFileSync(certPath, 'utf8'), readFileSync(keyPath, 'utf8'))

    expect(result.match).toBe(true)
    expect(result.certCommonName).toBe('ecdsa.example.com')
    expect(result.keyType).toBe('ECDSA P-384')
  })
})
