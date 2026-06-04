'use client'
import { useState } from 'react'
import ToolPageLayout from '@/components/ToolPageLayout'
import ResultCard from '@/components/ResultCard'
import CliHint from '@/components/CliHint'

interface SslResult {
  status: string; daysRemaining: number; issuedTo: string; issuer: string
  validFrom: string; validTo: string; algorithm: string; protocol: string; sans: string[]
  error?: string
}

export default function SslCheckerPage() {
  const [domain, setDomain] = useState('')
  const [result, setResult] = useState<SslResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCheck = async () => {
    if (!domain.trim()) return
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/ssl-checker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) })
    setResult(await res.json())
    setLoading(false)
  }

  return (
    <ToolPageLayout icon="🔍" title="SSL Checker" description="Masukkan domain untuk mengecek status dan detail sertifikat SSL-nya.">
      <div className="bg-surface border border-border rounded-xl p-5">
        <label className="text-slate-300 text-sm font-medium block mb-2">Domain</label>
        <div className="flex gap-3">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            placeholder="example.com"
            className="flex-1 bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary"
          />
          <button onClick={handleCheck} disabled={loading}
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50">
            {loading ? 'Checking...' : 'Check SSL'}
          </button>
        </div>
      </div>

      {result && !result.error && (
        <ResultCard
          status={result.status === 'valid' ? 'success' : 'error'}
          statusText={result.status === 'valid' ? `Valid — ${result.daysRemaining} days remaining` : `Expired ${Math.abs(result.daysRemaining)} days ago`}
          rows={[
            { label: 'Issued To', value: result.issuedTo },
            { label: 'Issuer', value: result.issuer },
            { label: 'Valid From', value: result.validFrom },
            { label: 'Valid To', value: result.validTo },
            { label: 'Algorithm', value: result.algorithm },
            { label: 'Protocol', value: result.protocol },
            { label: 'SANs', value: result.sans },
          ]}
        />
      )}
      {result?.error && (
        <div className="bg-surface border border-red-800 rounded-xl p-5 mt-4 text-red-400">{result.error}</div>
      )}

      <CliHint command={`ssl-tools check ${domain || 'example.com'}`} />
    </ToolPageLayout>
  )
}
