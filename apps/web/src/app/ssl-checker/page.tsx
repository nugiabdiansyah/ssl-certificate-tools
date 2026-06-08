'use client'
import { useState } from 'react'
import ToolPageLayout from '@/components/ToolPageLayout'
import CliHint from '@/components/CliHint'
import { useTheme } from '@/components/ThemeProvider'
import type { SslResult, ChainCert } from '@/lib/ssl-checker'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function CertLabel({ isLeaf, isRoot }: { isLeaf: boolean; isRoot: boolean }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  if (isLeaf) return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
      dark
        ? 'bg-indigo-900/60 text-indigo-300 border-indigo-700'
        : 'bg-indigo-50 text-indigo-700 border-indigo-300'
    }`}>Server Certificate</span>
  )
  if (isRoot) return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
      dark
        ? 'bg-slate-700/60 text-slate-300 border-slate-600'
        : 'bg-slate-100 text-slate-600 border-slate-300'
    }`}>Root CA</span>
  )
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
      dark
        ? 'bg-purple-900/40 text-purple-300 border-purple-700/60'
        : 'bg-purple-50 text-purple-700 border-purple-300'
    }`}>Intermediate</span>
  )
}

function CertRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-1.5 border-b border-border/50 last:border-0">
      <dt className="text-muted text-xs w-40 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-slate-300 text-sm break-all">{value}</dd>
    </div>
  )
}

function ChainCard({ cert, index, total }: { cert: ChainCert; index: number; total: number }) {
  const [expanded, setExpanded] = useState(index === 0)
  const isLast = index === total - 1

  return (
    <div className="flex gap-0">
      {/* Timeline line */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <div className={`w-3 h-3 rounded-full mt-6 shrink-0 border-2 ${cert.isLeaf ? 'bg-primary border-primary' : cert.isRoot ? 'bg-slate-600 border-slate-500' : 'bg-purple-600 border-purple-500'}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-3 bg-surface border rounded-xl overflow-hidden ${cert.isLeaf ? 'border-primary/40' : 'border-border'}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-black/[0.03] transition-colors"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-base">🔒</span>
            <span className="font-semibold text-slate-200">{cert.commonName}</span>
            <CertLabel isLeaf={cert.isLeaf} isRoot={cert.isRoot} />
            {cert.organization && !cert.isLeaf && (
              <span className="text-muted text-xs">— {cert.organization}</span>
            )}
          </div>
          <span className="text-subtle text-xs ml-3 shrink-0">{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div className="px-5 pb-4 border-t border-border">
            <dl className="mt-3 space-y-0">
              <CertRow label="Common Name" value={cert.commonName} />
              {cert.organization && <CertRow label="Organization" value={cert.organization} />}
              {cert.country && <CertRow label="Location" value={cert.country} />}
              {cert.isLeaf && cert.sans.length > 0 && (
                <CertRow label="SANs" value={cert.sans.join(', ')} />
              )}
              <CertRow
                label="Valid"
                value={`${formatDate(cert.validFrom)} to ${formatDate(cert.validTo)}`}
              />
              <CertRow label="Serial Number" value={cert.serialNumber} />
              <CertRow label="Signature Algorithm" value={cert.signatureAlgorithm} />
              <CertRow label="Issuer" value={cert.issuerCN} />
              <CertRow label="Fingerprint SHA-1" value={cert.sha1Fingerprint} />
              <CertRow label="Fingerprint SHA-256" value={cert.sha256Fingerprint} />
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

interface ApiResult extends SslResult {
  error?: string
}

export default function SslCheckerPage() {
  const [domain, setDomain] = useState('')
  const [checkedDomain, setCheckedDomain] = useState('')
  const [result, setResult] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCheck = async () => {
    const d = domain.trim()
    if (!d) return
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/ssl-checker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: d }),
    })
    setCheckedDomain(d.replace(/^https?:\/\//, '').split('/')[0].split(':')[0])
    setResult(await res.json())
    setLoading(false)
  }

  return (
    <ToolPageLayout icon="🔍" title="SSL Checker" description="Enter a domain to check its SSL certificate status, full chain, and details.">
      {/* Input */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <label className="text-slate-300 text-sm font-medium block mb-2">Domain</label>
        <div className="flex gap-3">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            placeholder="example.com"
            className="flex-1 bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleCheck}
            disabled={loading || !domain.trim()}
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check SSL'}
          </button>
        </div>
      </div>

      {/* Error */}
      {result?.error && (
        <div className="bg-surface border border-red-800 rounded-xl p-5 mb-6 text-red-400">
          {result.error}
        </div>
      )}

      {/* Results */}
      {result && !result.error && (
        <>
          {/* Summary */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-6 space-y-3">
            <div className="flex items-start gap-2.5 text-sm text-slate-300">
              <span className="text-primary-light mt-0.5">→</span>
              <span>
                <span className="font-medium text-slate-200">{checkedDomain}</span>
                {' '}resolves to{' '}
                <span className="font-mono text-primary-light">{result.resolvedIp}</span>
              </span>
            </div>

            {result.serverType && result.serverType !== 'Unknown' && (
              <div className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="text-muted mt-0.5">→</span>
                <span>Server Type: <span className="text-slate-200 font-medium">{result.serverType}</span></span>
              </div>
            )}

            <div className={`flex items-start gap-2.5 text-sm ${result.isTrusted ? 'text-green-400' : 'text-yellow-400'}`}>
              <span className="mt-0.5">{result.isTrusted ? '✓' : '⚠'}</span>
              <span>
                {result.isTrusted
                  ? 'The certificate should be trusted by all major web browsers (all the correct intermediate certificates are installed).'
                  : 'The certificate may not be trusted by all browsers (self-signed or incomplete chain).'}
              </span>
            </div>

            <div className={`flex items-start gap-2.5 text-sm ${result.daysRemaining > 30 ? 'text-green-400' : result.daysRemaining > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
              <span className="mt-0.5">{result.daysRemaining > 0 ? (result.daysRemaining <= 30 ? '⚠' : '✓') : '✗'}</span>
              <span>
                {result.daysRemaining > 0
                  ? `The certificate will expire in ${result.daysRemaining} days.`
                  : `The certificate expired ${Math.abs(result.daysRemaining)} days ago.`}
              </span>
            </div>

            <div className={`flex items-start gap-2.5 text-sm ${result.hostnameValid ? 'text-green-400' : 'text-red-400'}`}>
              <span className="mt-0.5">{result.hostnameValid ? '✓' : '✗'}</span>
              <span>
                {result.hostnameValid
                  ? `The hostname (${checkedDomain}) is correctly listed in the certificate.`
                  : `The hostname (${checkedDomain}) is NOT listed in the certificate.`}
              </span>
            </div>
          </div>

          {/* Certificate Chain */}
          {result.chain.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Certificate Chain</h2>
              <div className="pl-1">
                {result.chain.map((cert, i) => (
                  <ChainCard key={cert.serialNumber || i} cert={cert} index={i} total={result.chain.length} />
                ))}
              </div>
            </div>
          )}

          {/* Protocol + Algorithm summary */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Protocol', value: result.protocol },
              { label: 'Key Algorithm', value: result.algorithm },
              { label: 'Status', value: result.status.charAt(0).toUpperCase() + result.status.slice(1) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface border border-border rounded-lg px-4 py-3">
                <div className="text-muted text-xs mb-1">{label}</div>
                <div className={`text-sm font-medium ${label === 'Status' ? (result.status === 'valid' ? 'text-green-400' : 'text-red-400') : 'text-slate-200'}`}>{value}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <CliHint command={`ssl-tools check ${checkedDomain || 'example.com'}`} />
    </ToolPageLayout>
  )
}
