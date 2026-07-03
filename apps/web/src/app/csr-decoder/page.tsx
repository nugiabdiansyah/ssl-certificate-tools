'use client'
import { useState } from 'react'
import ToolPageLayout from '@/components/ToolPageLayout'
import ResultCard from '@/components/ResultCard'
import FileUploadArea from '@/components/FileUploadArea'
import CliHint from '@/components/CliHint'

export default function CsrDecoderPage() {
  const [pem, setPem] = useState('')
  const [result, setResult] = useState<Record<string, string | string[]> | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDecode = async () => {
    if (!pem.trim()) return
    setLoading(true); setError(''); setResult(null)
    const res = await fetch('/api/csr-decoder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pem }) })
    const data = await res.json()
    if (data.error) setError(data.error)
    else setResult({
      'Common Name': data.commonName,
      'Organization': data.organization,
      'Organizational Unit': data.organizationalUnit,
      'Country': data.country,
      'State': data.state,
      'Locality': data.locality,
      'Email': data.email,
      'Domain Type': data.domainType,
      'Public Key': `${data.publicKeyAlgorithm} ${data.publicKeyBits}-bit`,
      'Signature Algorithm': data.signatureAlgorithm,
      'SANs': data.sans,
    })
    setLoading(false)
  }

  return (
    <ToolPageLayout icon="📄" title="CSR Decoder" description="Paste or upload a CSR to inspect its fields.">
      <div className="bg-surface border border-border rounded-xl p-5">
        <FileUploadArea value={pem} onChange={setPem} placeholder="-----BEGIN CERTIFICATE REQUEST-----&#10;...&#10;-----END CERTIFICATE REQUEST-----" label="CSR (PEM)" accept=".csr,.pem,.txt" />
        <button onClick={handleDecode} disabled={loading || !pem.trim()}
          className="mt-4 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50">
          {loading ? 'Decoding...' : 'Decode CSR'}
        </button>
      </div>
      {result && <ResultCard rows={Object.entries(result).filter(([,v]) => v && (Array.isArray(v) ? v.length > 0 : true)).map(([label, value]) => ({ label, value: value as string | string[] }))} />}
      {error && <div className="bg-surface border border-red-800 rounded-xl p-5 mt-4 text-red-400">{error}</div>}
      <CliHint command="ssl-tools decode-csr certificate.csr" />
    </ToolPageLayout>
  )
}
