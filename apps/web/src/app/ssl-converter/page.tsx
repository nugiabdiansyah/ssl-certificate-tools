'use client'
import { useState, useRef } from 'react'
import ToolPageLayout from '@/components/ToolPageLayout'
import CliHint from '@/components/CliHint'

type Format = 'pem' | 'der' | 'pfx'

export default function SslConverterPage() {
  const [certFile, setCertFile] = useState<File | null>(null)
  const [keyFile, setKeyFile] = useState<File | null>(null)
  const [format, setFormat] = useState<Format>('der')
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const certRef = useRef<HTMLInputElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)

  const handleConvert = async () => {
    if (!certFile) return
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('cert', certFile)
    if (keyFile) fd.append('key', keyFile)
    fd.append('format', format)
    if (passphrase) fd.append('passphrase', passphrase)
    const res = await fetch('/api/ssl-converter', { method: 'POST', body: fd })
    if (!res.ok) { const d = await res.json(); setError(d.error); setLoading(false); return }
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') ?? ''
    const filename = cd.match(/filename="(.+?)"/)?.[1] ?? 'certificate'
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
    setLoading(false)
  }

  return (
    <ToolPageLayout icon="🔄" title="SSL Converter" description="Konversi format sertifikat SSL: PEM ↔ DER ↔ PFX/P12.">
      <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-2">Certificate File</label>
          <div className="flex items-center gap-3">
            <button onClick={() => certRef.current?.click()} className="border border-border px-4 py-2 rounded-lg text-sm text-slate-300 hover:border-primary transition-colors">Choose file</button>
            <span className="text-subtle text-sm">{certFile?.name ?? 'No file chosen'}</span>
            <input ref={certRef} type="file" accept=".pem,.crt,.der,.cer" className="hidden" onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div>
          <label className="text-slate-300 text-sm font-medium block mb-2">Target Format</label>
          <div className="flex gap-3">
            {(['pem', 'der', 'pfx'] as Format[]).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${format === f ? 'bg-primary text-white' : 'border border-border text-slate-300 hover:border-primary'}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {format === 'pfx' && (
          <>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-2">Private Key (required for PFX)</label>
              <div className="flex items-center gap-3">
                <button onClick={() => keyRef.current?.click()} className="border border-border px-4 py-2 rounded-lg text-sm text-slate-300 hover:border-primary transition-colors">Choose file</button>
                <span className="text-subtle text-sm">{keyFile?.name ?? 'No file chosen'}</span>
                <input ref={keyRef} type="file" accept=".key,.pem" className="hidden" onChange={(e) => setKeyFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-2">Passphrase (optional)</label>
              <input value={passphrase} onChange={(e) => setPassphrase(e.target.value)} type="password" placeholder="Leave empty for no passphrase"
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary" />
            </div>
          </>
        )}

        <button onClick={handleConvert} disabled={loading || !certFile}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {loading ? 'Converting...' : `Convert & Download ${format.toUpperCase()}`}
        </button>
      </div>

      {error && <div className="bg-surface border border-red-800 rounded-xl p-5 mt-4 text-red-400">{error}</div>}
      <CliHint command={`ssl-tools convert certificate.pem --to ${format}${format === 'pfx' ? ' --key private.key' : ''}`} />
    </ToolPageLayout>
  )
}
