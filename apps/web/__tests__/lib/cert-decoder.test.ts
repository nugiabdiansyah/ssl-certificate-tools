import { decodeCert } from '@/lib/cert-decoder'
import { fixtures } from '../fixtures'

describe('decodeCert', () => {
  it('decodes common name', () => {
    const result = decodeCert(fixtures.certPem)
    expect(result.subject.commonName).toBe('test.example.com')
  })
  it('decodes serial number', () => {
    const result = decodeCert(fixtures.certPem)
    expect(result.serialNumber).toBeTruthy()
  })
  it('computes SHA-256 fingerprint as hex string', () => {
    const result = decodeCert(fixtures.certPem)
    expect(result.fingerprintSha256).toMatch(/^[0-9A-F:]+$/)
  })
  it('throws on invalid input', () => {
    expect(() => decodeCert('bad input')).toThrow()
  })
})
