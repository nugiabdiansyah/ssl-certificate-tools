'use client'
import { useState } from 'react'
import ToolPageLayout from '@/components/ToolPageLayout'
import FileUploadArea from '@/components/FileUploadArea'
import CliHint from '@/components/CliHint'

interface MatchResult { match: boolean; certCommonName: string; keyType: string; explanation: string; error?: string }

export default function KeyMatcherPage() {
  const [cert, setCert] = useState('')
  const [key, setKey] = useState('')
  const [result, setResult] = useState<MatchResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleMatch = async () => {
    if (!cert.trim() || !key.trim()) return
    setLoading(true); setResult(null)
    const res = await fetch('/api/key-matcher', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cert, key }) })
    setResult(await res.json())
    setLoading(false)
  }

  return (
    <ToolPageLayout icon="🔑" title="Certificate Key Matcher" description="Verifikasi apakah private key cocok dengan sertifikat.">
      <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
        <FileUploadArea value={cert} onChange={setCert} placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----" label="Certificate (PEM)" />
        <FileUploadArea value={key} onChange={setKey} placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----" label="Private Key (PEM)" accept=".key,.pem,.txt" />
        <button onClick={handleMatch} disabled={loading || !cert.trim() || !key.trim()}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {loading ? 'Checking...' : 'Check Match'}
        </button>
      </div>

      {result && !result.error && (
        <div className={`mt-4 bg-surface border rounded-xl p-5 ${result.match ? 'border-green-700' : 'border-red-700'}`}>
          <div className={`flex items-center gap-2 font-bold text-lg mb-2 ${result.match ? 'text-green-400' : 'text-red-400'}`}>
            {result.match ? '✓ Match' : '✗ No Match'}
          </div>
          <p className="text-slate-300 text-sm mb-3">{result.explanation}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted text-xs">Common Name</dt><dd className="text-slate-200">{result.certCommonName}</dd></div>
            <div><dt className="text-muted text-xs">Key Type</dt><dd className="text-slate-200">{result.keyType}</dd></div>
          </dl>
        </div>
      )}
      {result?.error && <div className="bg-surface border border-red-800 rounded-xl p-5 mt-4 text-red-400">{result.error}</div>}

      <CliHint command="ssl-tools match certificate.crt private.key" />
    </ToolPageLayout>
  )
}
