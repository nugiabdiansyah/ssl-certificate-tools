import { matchKeyToCert } from '@/lib/key-matcher'
import { fixtures } from '../fixtures'
import forge from 'node-forge'

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
})
