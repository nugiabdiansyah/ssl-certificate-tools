import forge from 'node-forge'

function generateFixtures() {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date('2024-01-01')
  cert.validity.notAfter = new Date('2025-01-01')
  const attrs = [
    { name: 'commonName', value: 'test.example.com' },
    { name: 'organizationName', value: 'Test Org' },
    { name: 'countryName', value: 'ID' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([
    { name: 'subjectAltName', altNames: [{ type: 2, value: 'test.example.com' }, { type: 2, value: 'www.test.example.com' }] },
  ])
  cert.sign(keys.privateKey, forge.md.sha256.create())

  const csr = forge.pki.createCertificationRequest()
  csr.publicKey = keys.publicKey
  csr.setSubject(attrs)
  csr.sign(keys.privateKey)

  return {
    certPem: forge.pki.certificateToPem(cert),
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    publicKeyPem: forge.pki.publicKeyToPem(keys.publicKey),
    csrPem: forge.pki.certificationRequestToPem(csr),
    otherKeys: forge.pki.rsa.generateKeyPair(2048),
  }
}

export const fixtures = generateFixtures()
