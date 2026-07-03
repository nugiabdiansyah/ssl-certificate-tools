import { decodeCert } from '@/lib/cert-decoder'
import { fixtures } from '../fixtures'

const letsEncryptEcCert = `-----BEGIN CERTIFICATE-----
MIIDsjCCAzegAwIBAgISBcgYcUlez0+bsx6v+ve1cQzaMAoGCCqGSM49BAMDMDMx
CzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQwwCgYDVQQDEwNZ
RTEwHhcNMjYwNjE4MTA1NTQwWhcNMjYwOTE2MTA1NTM5WjAWMRQwEgYDVQQDEwtu
dWdpLndlYi5pZDB2MBAGByqGSM49AgEGBSuBBAAiA2IABCx7l2lFaUSoq7mGlvCq
g1AGIa6sCBzZl9BU3oKOiW6+vlDiMXKWyEErrTSs2UcbOHJuzySDiR/jR3xr3LRD
Q3e0Eb1f5BFWxBdUPasAbFHvIZdpI3VjN+TmKCEYH3oRMaOCAikwggIlMA4GA1Ud
DwEB/wQEAwIHgDATBgNVHSUEDDAKBggrBgEFBQcDATAMBgNVHRMBAf8EAjAAMB0G
A1UdDgQWBBS42amSEvLzvAx7yvcqBpjcNWpqLzAfBgNVHSMEGDAWgBS7IMpHC/7X
5Zz5jwkqo4w3RbG82DAzBggrBgEFBQcBAQQnMCUwIwYIKwYBBQUHMAKGF2h0dHA6
Ly95ZTEuaS5sZW5jci5vcmcvMCUGA1UdEQQeMByCDSoubnVnaS53ZWIuaWSCC251
Z2kud2ViLmlkMBMGA1UdIAQMMAowCAYGZ4EMAQIBMC4GA1UdHwQnMCUwI6AhoB+G
HWh0dHA6Ly95ZTEuYy5sZW5jci5vcmcvOTEuY3JsMIIBDQYKKwYBBAHWeQIEAgSB
/gSB+wD5AHcAyKPEf8ezrbk1awE/anoSbeM6TkOlxkb5l605dZkdz5oAAAGe2pTi
ugAABAMASDBGAiEApBM5FY+wPAsayHv/OhNH0nep0PD/uv8bUZfdnAYqdk4CIQDZ
+MOtsnBmvOtxnKQhIDz1HOEkfYce+l+AA3tsCLV0oAB+AKgmy+MKxjUSRlM/4GXx
TxnZbhkIE8Qd2W15ALMSPFUnAAABntqU5cUACAAABQAQC7EUBAMARzBFAiEA4Fiq
FLc8PCuHfocKXStc3axGxCzSZbzdWCpaZjJ48hsCIGOVrC/ipp+3LBT+nW6KRHP2
RNk/rnjt35dOnW8R5TFtMAoGCCqGSM49BAMDA2kAMGYCMQD3Pyocp6N40mDG9qDT
k9Oi7fIyUTaJiIVhlC7/rHpNhPf5qt6rFk9VhnLeZ8MKVv0CMQCzKq1byY3Hgkh4
ouXAC02U0yAZ1zct7SrFJ7FdD0HajMMo5oTYRwIoH5nu4KOaBQg=
-----END CERTIFICATE-----`

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
  it('classifies a certificate with multiple DNS names as multi domain', () => {
    const result = decodeCert(fixtures.certPem)
    expect(result.domainType).toBe('Multi Domain')
  })
  it('decodes an EC Lets Encrypt wildcard certificate', () => {
    const result = decodeCert(letsEncryptEcCert)
    expect(result.subject.commonName).toBe('nugi.web.id')
    expect(result.publicKey.algorithm).toBe('ECDSA')
    expect(result.publicKey.bits).toBe(384)
    expect(result.sans).toEqual(['*.nugi.web.id', 'nugi.web.id'])
    expect(result.domainType).toBe('Wildcard')
  })
})
