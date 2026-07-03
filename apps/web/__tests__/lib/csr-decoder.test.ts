import { decodeCsr } from '@/lib/csr-decoder'
import { createCsr } from '@/lib/csr-creator'
import { fixtures } from '../fixtures'

describe('decodeCsr', () => {
  it('decodes common name from CSR', () => {
    const result = decodeCsr(fixtures.csrPem)
    expect(result.commonName).toBe('test.example.com')
  })
  it('decodes organization from CSR', () => {
    const result = decodeCsr(fixtures.csrPem)
    expect(result.organization).toBe('Test Org')
  })
  it('throws on invalid PEM', () => {
    expect(() => decodeCsr('not a valid csr')).toThrow()
  })
  it('classifies a CSR with one DNS name as single domain', () => {
    const result = decodeCsr(fixtures.csrPem)
    expect(result.domainType).toBe('Single Domain')
  })
  it('decodes an ECDSA CSR created by CSR Creator', () => {
    const csr = createCsr({
      commonName: 'ecdsa.example.com',
      sans: ['ecdsa.example.com', 'www.ecdsa.example.com'],
    })
    const result = decodeCsr(csr.csrPem)

    expect(result.commonName).toBe('ecdsa.example.com')
    expect(result.publicKeyAlgorithm).toBe('ECDSA')
    expect(result.publicKeyBits).toBe(384)
    expect(result.signatureAlgorithm).toBe('ecdsa-with-SHA384')
    expect(result.sans).toEqual(['ecdsa.example.com', 'www.ecdsa.example.com'])
    expect(result.domainType).toBe('Multi Domain')
  })
})
