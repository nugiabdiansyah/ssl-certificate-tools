import { convertCert, detectFormat } from '@/lib/ssl-converter'
import { fixtures } from '../fixtures'

describe('detectFormat', () => {
  it('detects PEM format', () => {
    expect(detectFormat(fixtures.certPem)).toBe('pem')
  })
})

describe('convertCert', () => {
  it('converts PEM to DER (returns Buffer)', () => {
    const result = convertCert(fixtures.certPem, 'der')
    expect(result.data).toBeInstanceOf(Buffer)
    expect(result.filename).toMatch(/\.der$/)
  })
  it('converts PEM to PEM (round-trip)', () => {
    const result = convertCert(fixtures.certPem, 'pem')
    expect(result.data.toString()).toContain('BEGIN CERTIFICATE')
  })
})
