'use client'
import { useState } from 'react'
import ToolPageLayout from '@/components/ToolPageLayout'
import ResultCard from '@/components/ResultCard'
import FileUploadArea from '@/components/FileUploadArea'
import CliHint from '@/components/CliHint'

export default function CertDecoderPage() {
  const [pem, setPem] = useState('')
  const [result, setResult] = useState<Record<string, string | string[]> | null>(null)
  const [raw, setRaw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const handleDecode = async () => {
    if (!pem.trim()) return
    setLoading(true); setError(''); setResult(null)
    const res = await fetch('/api/cert-decoder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pem }) })
    const data = await res.json()
    if (data.error) { setError(data.error) }
    else {
      setRaw(data.pemRaw)
      setResult({
        'Common Name': data.subject.commonName,
        'Organization': data.subject.organization,
        'Country': data.subject.country,
        'Issuer': data.issuer.commonName || data.issuer.organization,
        'Serial Number': data.serialNumber,
        'Valid From': data.validFrom,
        'Valid To': `${data.validTo} (${data.daysRemaining} days)`,
        'Public Key': `${data.publicKey.algorithm} ${data.publicKey.bits}-bit`,
        'Signature Algorithm': data.signatureAlgorithm,
        'SANs': data.sans,
        'Key Usage': data.keyUsage,
        'Fingerprint SHA-1': data.fingerprintSha1,
        'Fingerprint SHA-256': data.fingerprintSha256,
      })
    }
    setLoading(false)
  }

  return (
    <ToolPageLayout icon="🔐" title="Certificate Decoder" description="Paste or upload an X.509 certificate (PEM/DER) to inspect all its fields.">
      <div className="bg-surface border border-border rounded-xl p-5">
        <FileUploadArea value={pem} onChange={setPem} placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----" label="Certificate (PEM atau DER base64)" />
        <button onClick={handleDecode} disabled={loading || !pem.trim()}
          className="mt-4 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {loading ? 'Decoding...' : 'Decode Certificate'}
        </button>
      </div>
      {result && <ResultCard rows={Object.entries(result).filter(([,v]) => v && (Array.isArray(v) ? v.length > 0 : v !== '')).map(([label, value]) => ({ label, value: value as string | string[] }))} />}
      {raw && (
        <div className="mt-4 bg-surface border border-border rounded-xl overflow-hidden">
          <button onClick={() => setShowRaw(!showRaw)} className="w-full px-4 py-3 text-left text-subtle text-sm hover:text-slate-300 flex justify-between">
            <span>Raw PEM</span><span>{showRaw ? '▲' : '▼'}</span>
          </button>
          {showRaw && <pre className="px-4 pb-4 text-xs text-slate-400 font-mono overflow-auto">{raw}</pre>}
        </div>
      )}
      {error && <div className="bg-surface border border-red-800 rounded-xl p-5 mt-4 text-red-400">{error}</div>}
      <CliHint command="ssl-tools decode-cert certificate.crt" />
    </ToolPageLayout>
  )
}
