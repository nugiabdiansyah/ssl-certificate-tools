'use client'
import { useState, useRef } from 'react'
import ToolPageLayout from '@/components/ToolPageLayout'
import CliHint from '@/components/CliHint'
import type { FingerprintResult } from '@/lib/fingerprint'

type Mode = 'live' | 'file'

// ─── Small helpers ─────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="shrink-0 text-xs px-2.5 py-1 rounded border border-border text-muted hover:text-slate-300 hover:border-primary/60 transition-all"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  )
}

function FpRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 border-b border-border/50 last:border-0${highlight ? ' rounded-lg -mx-3 px-3 bg-primary/5' : ''}`}>
      <div className="flex-1 min-w-0">
        <dt className={`text-xs mb-0.5 ${highlight ? 'text-primary-light font-semibold' : 'text-muted'}`}>{label}</dt>
        <dd className={`text-sm font-mono break-all ${highlight ? 'text-primary-light' : 'text-slate-300'}`}>{value}</dd>
      </div>
      <CopyButton text={value} />
    </div>
  )
}

function StatusBadge({ days }: { days: number }) {
  if (days < 0)   return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">Expired</span>
  if (days < 30)  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Expires in {days}d</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">Valid · {days}d left</span>
}

function CodeSnippet({ children }: { children: string }) {
  return (
    <pre className="bg-bg border border-border rounded-lg px-4 py-3 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre">
      {children}
    </pre>
  )
}

// ─── Result card ───────────────────────────────────────────────────────────

function ResultCard({ r }: { r: FingerprintResult }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-border">
          <div>
            <p className="font-semibold text-slate-200 text-lg">{r.commonName || '(no CN)'}</p>
            <p className="text-muted text-sm mt-0.5">{r.issuer}</p>
          </div>
          <StatusBadge days={r.daysRemaining} />
        </div>

        {/* Fingerprints */}
        <dl className="space-y-0">
          <FpRow label="SHA-1" value={r.sha1} />
          <FpRow label="SHA-256" value={r.sha256} />
          <FpRow label="Proxmox / PBS Format" value={r.proxmox} highlight />
        </dl>
      </div>

      {/* PBS Config Snippets */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <span className="text-slate-200 text-sm font-semibold">PBS / PVE Config Snippets</span>
          <span className="ml-2 text-xs text-muted">Proxmox Backup Server · Proxmox VE</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-muted text-xs mb-2">PBS Web UI — Fingerprint field when adding a remote or storage:</p>
            <div className="flex items-center gap-2">
              <CodeSnippet>{r.proxmox}</CodeSnippet>
              <CopyButton text={r.proxmox} />
            </div>
          </div>
          <div>
            <p className="text-muted text-xs mb-2">PVE <code className="bg-border px-1 rounded">/etc/pve/storage.cfg</code> or PBS datastore config:</p>
            <div className="flex items-center gap-2">
              <CodeSnippet>{`fingerprint ${r.sha256}`}</CodeSnippet>
              <CopyButton text={`fingerprint ${r.sha256}`} />
            </div>
          </div>
          <div>
            <p className="text-muted text-xs mb-2"><code className="bg-border px-1 rounded">proxmox-backup-client</code> CLI argument:</p>
            <div className="flex items-center gap-2">
              <CodeSnippet>{`--fingerprint ${r.sha256}`}</CodeSnippet>
              <CopyButton text={`--fingerprint ${r.sha256}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Cert details */}
      <details className="group">
        <summary className="text-muted text-xs cursor-pointer hover:text-slate-300 transition-colors select-none">
          Certificate details ▾
        </summary>
        <div className="mt-2 bg-surface border border-border rounded-xl p-4">
          <dl className="space-y-1 text-sm">
            {[
              ['Common Name', r.commonName],
              ['Organization', r.organization],
              ['Issuer', r.issuer],
              ['Serial', r.serialNumber],
              ['Valid From', r.validFrom ? new Date(r.validFrom).toUTCString() : ''],
              ['Valid To',   r.validTo   ? new Date(r.validTo).toUTCString() : ''],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex gap-4 py-1 border-b border-border/40 last:border-0">
                <dt className="text-muted text-xs w-36 shrink-0 pt-0.5">{k}</dt>
                <dd className="text-slate-300 text-xs font-mono break-all">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function FingerprintPage() {
  const [mode, setMode]       = useState<Mode>('live')
  const [host, setHost]       = useState('')
  const [port, setPort]       = useState('443')
  const [certFile, setCertFile] = useState<File | null>(null)
  const [result, setResult]   = useState<FingerprintResult | null>(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const switchMode = (m: Mode) => { setMode(m); setResult(null); setError('') }

  const handleCheck = async () => {
    setLoading(true); setResult(null); setError('')
    try {
      let res: Response

      if (mode === 'live') {
        if (!host.trim()) { setError('e.g. minio.internal or 192.168.1.10'); setLoading(false); return }
        res = await fetch('/api/fingerprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: host.trim(), port: Number(port) || 443 }),
        })
      } else {
        if (!certFile) { setError('Please select a certificate file first'); setLoading(false); return }
        const fd = new FormData()
        fd.append('cert', certFile)
        res = await fetch('/api/fingerprint', { method: 'POST', body: fd })
      }

      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error ?? 'Failed'); setLoading(false); return }
      setResult(data)
    } catch {
      setError('Request failed — check your network connection')
    }
    setLoading(false)
  }

  const cliHint = mode === 'live'
    ? `ssl-tools fingerprint ${host || 'minio.internal'}${port !== '443' ? `:${port}` : ''}`
    : `ssl-tools decode-cert ${certFile?.name ?? 'certificate.crt'}`

  return (
    <ToolPageLayout
      icon="🔏"
      title="Certificate Fingerprint"
      description="Get SHA-1, SHA-256, and Proxmox/PBS fingerprint from an SSL certificate — live check or file upload."
    >
      {/* Mode toggle */}
      <div className="inline-flex rounded-lg border border-border overflow-hidden text-sm mb-5">
        {([
          { id: 'live', label: '🌐 Live Check' },
          { id: 'file', label: '📄 Upload File' },
        ] as { id: Mode; label: string }[]).map((opt, i) => (
          <button key={opt.id} type="button" onClick={() => switchMode(opt.id)}
            className={`px-5 py-2.5 transition-colors ${i > 0 ? 'border-l border-border' : ''} ${
              mode === opt.id ? 'bg-primary/20 text-primary-light' : 'text-subtle hover:text-slate-300 hover:bg-white/[0.03]'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-5 space-y-4">
        {mode === 'live' ? (
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-2">Host / IP</label>
            <div className="flex gap-2">
              <input
                value={host} onChange={e => setHost(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
                placeholder="e.g. minio.internal or 192.168.1.10"
                className="flex-1 bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary"
              />
              <input
                value={port} onChange={e => setPort(e.target.value)}
                className="w-20 bg-bg border border-border rounded-lg px-3 py-2.5 text-slate-200 text-sm text-center focus:outline-none focus:border-primary"
                placeholder="443"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-2">Certificate File</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="border border-border px-4 py-2 rounded-lg text-sm text-slate-300 hover:border-primary transition-colors shrink-0">
                Choose file
              </button>
              <span className={`text-sm truncate ${certFile ? 'text-slate-300' : 'text-subtle'}`}>
                {certFile?.name ?? 'No file chosen'}
              </span>
              <input ref={fileRef} type="file" accept=".crt,.pem,.cer,.der" className="hidden"
                onChange={e => { setCertFile(e.target.files?.[0] ?? null); setResult(null); setError('') }} />
            </div>
          </div>
        )}

        <button onClick={handleCheck} disabled={loading}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {loading ? 'Checking...' : 'Get Fingerprint'}
        </button>
      </div>

      {error && (
        <div className="bg-surface border border-red-800 rounded-xl p-4 text-red-400 text-sm mb-5">{error}</div>
      )}

      {result && <ResultCard r={result} />}

      <div className="mt-5">
        <CliHint command={cliHint} />
      </div>
    </ToolPageLayout>
  )
}
