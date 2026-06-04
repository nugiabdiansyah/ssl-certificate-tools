import { decodeCsr } from '@/lib/csr-decoder'
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
})
