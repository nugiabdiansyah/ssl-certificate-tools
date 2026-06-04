import { parseDomain, buildSslResult } from '@/lib/ssl-checker'

describe('parseDomain', () => {
  it('strips https:// prefix', () => {
    expect(parseDomain('https://example.com')).toBe('example.com')
  })
  it('strips trailing slashes and paths', () => {
    expect(parseDomain('example.com/path')).toBe('example.com')
  })
  it('leaves clean domain unchanged', () => {
    expect(parseDomain('example.com')).toBe('example.com')
  })
})

describe('buildSslResult', () => {
  it('calculates days remaining correctly', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    const result = buildSslResult({ valid_to: futureDate.toISOString(), valid_from: new Date().toISOString(), subject: { CN: 'test.com' }, issuer: { O: 'Test CA' }, subjectaltname: '', bits: 2048 })
    expect(result.daysRemaining).toBeGreaterThan(9)
    expect(result.status).toBe('valid')
  })
  it('marks expired cert', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const result = buildSslResult({ valid_to: pastDate.toISOString(), valid_from: new Date().toISOString(), subject: { CN: 'test.com' }, issuer: { O: 'Test CA' }, subjectaltname: '', bits: 2048 })
    expect(result.status).toBe('expired')
  })
})
