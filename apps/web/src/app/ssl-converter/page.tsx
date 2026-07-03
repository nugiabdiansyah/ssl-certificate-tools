'use client'
import { useState, useRef } from 'react'
import ToolPageLayout from '@/components/ToolPageLayout'
import CliHint from '@/components/CliHint'

// ─── Types ─────────────────────────────────────────────────────────────────

type Mode = 'convert' | 'bundle' | 'tomcat' | 'key'
type CertFormat = 'pem' | 'der' | 'p7b' | 'pfx'

interface Conversion {
  from: CertFormat
  to: CertFormat
  needsKey?: boolean
  needsInputPassphrase?: boolean
  needsOutputPassphrase?: boolean
}

// ─── Data ──────────────────────────────────────────────────────────────────

const CONVERSIONS: Conversion[] = [
  { from: 'pem', to: 'der' },
  { from: 'pem', to: 'p7b' },
  { from: 'pem', to: 'pfx', needsKey: true, needsOutputPassphrase: true },
  { from: 'der', to: 'pem' },
  { from: 'der', to: 'p7b' },
  { from: 'p7b', to: 'pem' },
  { from: 'p7b', to: 'der' },
  { from: 'p7b', to: 'pfx', needsKey: true, needsOutputPassphrase: true },
  { from: 'pfx', to: 'pem', needsInputPassphrase: true },
  { from: 'pfx', to: 'p7b', needsInputPassphrase: true },
]

const FORMAT_GROUPS: { label: string; from: CertFormat; desc: string; color: string }[] = [
  { label: 'PEM',          from: 'pem', desc: '.pem .crt .cer', color: 'text-blue-400' },
  { label: 'DER',          from: 'der', desc: '.der .cer',      color: 'text-amber-400' },
  { label: 'P7B / PKCS#7', from: 'p7b', desc: '.p7b .p7c',     color: 'text-purple-400' },
  { label: 'PFX / PKCS#12',from: 'pfx', desc: '.pfx .p12',     color: 'text-teal-400' },
]

const FORMAT_BADGE: Record<CertFormat, string> = {
  pem: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  der: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  p7b: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  pfx: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
}

const FORMAT_ACCEPT: Record<CertFormat, string> = {
  pem: '.pem,.crt,.cer',
  der: '.der,.cer',
  p7b: '.p7b,.p7c',
  pfx: '.pfx,.p12',
}

// ─── Small helpers ─────────────────────────────────────────────────────────

function Badge({ fmt }: { fmt: CertFormat }) {
  return (
    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${FORMAT_BADGE[fmt]}`}>
      {fmt.toUpperCase()}
    </span>
  )
}

function FileField({
  label, hint, accept, file, onFile, inputRef,
}: {
  label: string; hint?: string; accept: string
  file: File | null; onFile: (f: File | null) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div>
      <label className="text-slate-300 text-sm font-medium block mb-1.5">
        {label}
        {hint && <span className="ml-2 text-muted text-xs font-normal font-mono">{hint}</span>}
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border border-border px-4 py-2 rounded-lg text-sm text-slate-300 hover:border-primary transition-colors shrink-0"
        >
          Choose file
        </button>
        <span className={`text-sm truncate ${file ? 'text-slate-300' : 'text-subtle'}`}>
          {file?.name ?? 'No file chosen'}
        </span>
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={e => onFile(e.target.files?.[0] ?? null)} />
      </div>
    </div>
  )
}

function PassphraseField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-slate-300 text-sm font-medium block mb-1.5">{label}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        type="password" placeholder={placeholder ?? ''}
        className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary"
      />
    </div>
  )
}

// ─── Chain Input (shared: bundle or split) ─────────────────────────────────

type ChainMode = 'bundle' | 'split'

interface ChainState {
  chainMode: ChainMode
  bundleFile: File | null
  intermediateFile: File | null
  rootcaFile: File | null
}

function ChainInputs({
  state, onChange,
}: {
  state: ChainState
  onChange: (patch: Partial<ChainState>) => void
}) {
  const bundleRef       = useRef<HTMLInputElement>(null)
  const intermediateRef = useRef<HTMLInputElement>(null)
  const rootcaRef       = useRef<HTMLInputElement>(null)
  const { chainMode } = state

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div>
        <label className="text-slate-300 text-sm font-medium block mb-2">CA Chain</label>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-sm">
          {([
            { id: 'bundle', label: '📦 Single Bundle' },
            { id: 'split',  label: '✂️ Separate Files' },
          ] as { id: ChainMode; label: string }[]).map((opt, i) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ chainMode: opt.id, bundleFile: null, intermediateFile: null, rootcaFile: null })}
              className={`px-4 py-2 transition-colors ${i > 0 ? 'border-l border-border' : ''} ${
                chainMode === opt.id
                  ? 'bg-primary/20 text-primary-light'
                  : 'text-subtle hover:text-slate-300 hover:bg-white/[0.03]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {chainMode === 'bundle' ? (
        <FileField
          label="CA Bundle" hint="ca_bundle.crt (intermediate + root CA)"
          accept=".crt,.pem,.cer"
          file={state.bundleFile}
          onFile={f => onChange({ bundleFile: f })}
          inputRef={bundleRef}
        />
      ) : (
        <div className="space-y-3 pl-3 border-l-2 border-primary/30">
          <FileField
            label="Intermediate CA" hint="intermediateca.crt"
            accept=".crt,.pem,.cer"
            file={state.intermediateFile}
            onFile={f => onChange({ intermediateFile: f })}
            inputRef={intermediateRef}
          />
          <FileField
            label="Root CA" hint="rootca.crt"
            accept=".crt,.pem,.cer"
            file={state.rootcaFile}
            onFile={f => onChange({ rootcaFile: f })}
            inputRef={rootcaRef}
          />
          <p className="text-muted text-xs">At least one required. Order: intermediate → root.</p>
        </div>
      )}
    </div>
  )
}

function chainReady(s: ChainState): boolean {
  if (s.chainMode === 'bundle') return !!s.bundleFile
  return !!(s.intermediateFile || s.rootcaFile)
}

function appendChainToFormData(fd: FormData, s: ChainState) {
  if (s.chainMode === 'bundle' && s.bundleFile) {
    fd.append('bundle', s.bundleFile)
  } else {
    if (s.intermediateFile) fd.append('intermediate', s.intermediateFile)
    if (s.rootcaFile)       fd.append('rootca', s.rootcaFile)
  }
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-bg border border-border rounded-lg px-4 py-3 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
      {children}
    </pre>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

const TABS: { id: Mode; label: string; icon: string }[] = [
  { id: 'convert', label: 'Format Convert',  icon: '🔄' },
  { id: 'bundle',  label: 'Build PEM Bundle', icon: '📦' },
  { id: 'tomcat',  label: 'Tomcat Keystore',  icon: '☕' },
  { id: 'key',     label: 'Private Key',       icon: '🔑' },
]

// ─── Page ──────────────────────────────────────────────────────────────────

export default function SslConverterPage() {
  const [mode, setMode] = useState<Mode>('convert')

  return (
    <ToolPageLayout
      icon="🔄"
      title="SSL Converter"
      description="Convert certificate formats, build PEM bundles, or generate Tomcat keystores."
    >
      {/* Tab selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              mode === t.id
                ? 'bg-primary border-primary text-white'
                : 'border-border text-subtle hover:border-primary/60 hover:text-slate-300'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {mode === 'convert' && <ConvertTab />}
      {mode === 'bundle'  && <BundleTab />}
      {mode === 'tomcat'  && <TomcatTab />}
      {mode === 'key'     && <KeyTab />}
    </ToolPageLayout>
  )
}

// ─── Tab: Format Convert ───────────────────────────────────────────────────

function ConvertTab() {
  const [selected, setSelected] = useState<Conversion | null>(null)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [keyFile,  setKeyFile]  = useState<File | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [legacy, setLegacy]     = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const certRef = useRef<HTMLInputElement>(null)
  const keyRef  = useRef<HTMLInputElement>(null)

  const handleSelect = (c: Conversion) => {
    setSelected(c); setCertFile(null); setKeyFile(null); setPassphrase(''); setLegacy(false); setError('')
  }

  const handleConvert = async () => {
    if (!selected || !certFile) return
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('mode', 'convert')
    fd.append('cert', certFile)
    fd.append('from', selected.from)
    fd.append('to', selected.to)
    if (keyFile) fd.append('key', keyFile)
    if (passphrase) fd.append('passphrase', passphrase)
    if (legacy) fd.append('legacy', 'true')
    const res = await fetch('/api/ssl-converter', { method: 'POST', body: fd })
    if (!res.ok) { setError((await res.json()).error ?? 'Failed'); setLoading(false); return }
    const blob = await res.blob()
    const fn = res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ?? `certificate.${selected.to}`
    downloadBlob(blob, fn)
    setLoading(false)
  }

  const cliHint = selected
    ? `ssl-tools convert cert.${selected.from} --to ${selected.to}${selected.needsKey ? ' --key private.key' : ''}${selected.needsInputPassphrase || selected.needsOutputPassphrase ? ' --passphrase <pass>' : ''}${selected.to === 'pfx' && legacy ? ' --legacy' : ''}`
    : 'ssl-tools convert certificate.pem --to der'

  return (
    <>
      {/* Format info strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {FORMAT_GROUPS.map(g => (
          <div key={g.from} className="bg-surface border border-border rounded-lg px-3 py-2">
            <div className={`text-xs font-bold mb-0.5 ${g.color}`}>{g.label}</div>
            <div className="text-muted text-[11px] font-mono">{g.desc}</div>
          </div>
        ))}
      </div>

      {/* Conversion grid */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-5">
        <p className="text-subtle text-xs uppercase tracking-wider font-semibold mb-4">Select Conversion</p>
        <div className="space-y-4">
          {FORMAT_GROUPS.map(group => (
            <div key={group.from}>
              <p className={`text-[11px] font-semibold mb-2 ${group.color}`}>{group.label} Source</p>
              <div className="flex flex-wrap gap-2">
                {CONVERSIONS.filter(c => c.from === group.from).map(conv => {
                  const active = selected?.from === conv.from && selected?.to === conv.to
                  return (
                    <button
                      key={`${conv.from}-${conv.to}`}
                      onClick={() => handleSelect(conv)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        active
                          ? 'bg-primary border-primary text-white'
                          : 'bg-bg border-border text-slate-300 hover:border-primary/60'
                      }`}
                    >
                      <Badge fmt={conv.from} />
                      <span className="text-muted text-xs">→</span>
                      <Badge fmt={conv.to} />
                      {conv.needsKey && <span className="text-[10px] text-muted ml-0.5">+key</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4 mb-5">
          <div className="flex items-center gap-2 text-sm pb-3 border-b border-border">
            <Badge fmt={selected.from} />
            <span className="text-muted">→</span>
            <Badge fmt={selected.to} />
          </div>
          <FileField label="Certificate File" hint={FORMAT_ACCEPT[selected.from]}
            accept={FORMAT_ACCEPT[selected.from]} file={certFile} onFile={setCertFile} inputRef={certRef} />
          {selected.needsInputPassphrase && (
            <PassphraseField label="Passphrase (decrypt PFX)" value={passphrase} onChange={setPassphrase}
              placeholder="Leave blank if none" />
          )}
          {selected.needsKey && (
            <FileField label="Private Key (required)" hint=".key .pem"
              accept=".key,.pem" file={keyFile} onFile={setKeyFile} inputRef={keyRef} />
          )}
          {selected.needsOutputPassphrase && (
            <PassphraseField label="Output Passphrase (optional, for PFX)" value={passphrase}
              onChange={setPassphrase} placeholder="Leave blank for PFX without passphrase" />
          )}
          {selected.to === 'pfx' && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={legacy} onChange={e => setLegacy(e.target.checked)}
                className="mt-0.5 accent-primary" />
              <span className="text-sm text-slate-300">
                Legacy Mode (3DES)
                <span className="block text-xs text-muted mt-0.5">
                  For legacy servers: Java &lt; 9, Tomcat &lt; 8.5, IIS, or systems that do not support AES-256.
                  Equivalent to <code className="font-mono text-[11px]">openssl pkcs12 -export -legacy</code>.
                </span>
              </span>
            </label>
          )}
          <button onClick={handleConvert} disabled={loading || !certFile || (!!selected.needsKey && !keyFile)}
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
            {loading ? 'Converting...' : `Convert & Download .${selected.to}`}
          </button>
        </div>
      )}
      {error && <div className="bg-surface border border-red-800 rounded-xl p-4 text-red-400 text-sm mb-4">{error}</div>}
      <CliHint command={cliHint} />
    </>
  )
}

// ─── Tab: Build PEM Bundle ─────────────────────────────────────────────────

function BundleTab() {
  const [certFile, setCertFile] = useState<File | null>(null)
  const [chain, setChain] = useState<ChainState>({
    chainMode: 'bundle', bundleFile: null, intermediateFile: null, rootcaFile: null,
  })
  const [keyFile,  setKeyFile]  = useState<File | null>(null)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const certRef = useRef<HTMLInputElement>(null)
  const keyRef  = useRef<HTMLInputElement>(null)

  const handleBuild = async () => {
    if (!certFile || !chainReady(chain)) return
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('mode', 'bundle')
    fd.append('cert', certFile)
    appendChainToFormData(fd, chain)
    if (keyFile) fd.append('key', keyFile)
    const res = await fetch('/api/ssl-converter', { method: 'POST', body: fd })
    if (!res.ok) { setError((await res.json()).error ?? 'Failed'); setLoading(false); return }
    downloadBlob(await res.blob(), 'fullchain.pem')
    setLoading(false)
  }

  const isSplit = chain.chainMode === 'split'

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-5 space-y-5 mb-5">
        <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 text-sm text-slate-300 leading-relaxed">
          Combine <code className="text-primary-light font-mono text-xs">certificate.crt</code> + CA chain
          into a single <code className="text-primary-light font-mono text-xs">fullchain.pem</code>.
          Optionally include the private key for servers like HAProxy.
        </div>

        <FileField label="Certificate" hint="certificate.crt / domain.crt"
          accept=".crt,.pem,.cer" file={certFile} onFile={setCertFile} inputRef={certRef} />

        <ChainInputs state={chain} onChange={patch => setChain(s => ({ ...s, ...patch }))} />

        <FileField label="Private Key (optional)" hint="commercial.key — only if the server needs the key in PEM"
          accept=".key,.pem" file={keyFile} onFile={setKeyFile} inputRef={keyRef} />

        <button onClick={handleBuild} disabled={loading || !certFile || !chainReady(chain)}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {loading ? 'Building...' : 'Build & Download fullchain.pem'}
        </button>
      </div>

      {/* Output structure preview */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-5">
        <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-3">Output Structure</p>
        <CodeBlock>{`-----BEGIN RSA PRIVATE KEY-----   ← only if key is provided
(commercial.key)
-----END RSA PRIVATE KEY-----

-----BEGIN CERTIFICATE-----
(certificate.crt — leaf certificate)
-----END CERTIFICATE-----

-----BEGIN CERTIFICATE-----
(${isSplit ? 'intermediateca.crt' : 'Intermediate CA from ca_bundle'})
-----END CERTIFICATE-----

-----BEGIN CERTIFICATE-----
(${isSplit ? 'rootca.crt' : 'Root CA from ca_bundle'})
-----END CERTIFICATE-----`}</CodeBlock>
      </div>

      {error && <div className="bg-surface border border-red-800 rounded-xl p-4 text-red-400 text-sm mb-4">{error}</div>}
      <CliHint command={(() => {
        const cert = certFile?.name ?? 'certificate.crt'
        const keyPart = keyFile ? ` --key ${keyFile.name}` : ''
        if (chain.chainMode === 'split') {
          const iPart = chain.intermediateFile ? ` --intermediate ${chain.intermediateFile.name}` : ''
          const rPart = chain.rootcaFile ? ` --rootca ${chain.rootcaFile.name}` : ''
          return `ssl-tools bundle ${cert}${iPart}${rPart}${keyPart}`
        }
        const b = chain.bundleFile?.name ?? 'ca_bundle.crt'
        return `ssl-tools bundle ${cert} --bundle ${b}${keyPart}`
      })()} />
    </>
  )
}

// ─── Tab: Tomcat Keystore ──────────────────────────────────────────────────

function TomcatTab() {
  const [certFile, setCertFile] = useState<File | null>(null)
  const [chain, setChain] = useState<ChainState>({
    chainMode: 'bundle', bundleFile: null, intermediateFile: null, rootcaFile: null,
  })
  const [keyFile,    setKeyFile]    = useState<File | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [legacy,     setLegacy]     = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const certRef = useRef<HTMLInputElement>(null)
  const keyRef  = useRef<HTMLInputElement>(null)

  const handleBuild = async () => {
    if (!certFile || !chainReady(chain) || !keyFile) return
    setLoading(true); setError(''); setDone(false)
    const fd = new FormData()
    fd.append('mode', 'tomcat')
    fd.append('cert', certFile)
    appendChainToFormData(fd, chain)
    fd.append('key', keyFile)
    if (passphrase) fd.append('passphrase', passphrase)
    if (legacy) fd.append('legacy', 'true')
    const res = await fetch('/api/ssl-converter', { method: 'POST', body: fd })
    if (!res.ok) { setError((await res.json()).error ?? 'Failed'); setLoading(false); return }
    downloadBlob(await res.blob(), 'keystore.p12')
    setLoading(false); setDone(true)
  }

  const pass = passphrase || 'changeit'

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-5 space-y-5 mb-5">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-slate-300 leading-relaxed">
          Generate a <code className="text-amber-400 font-mono text-xs">keystore.p12</code> (PKCS#12) containing the full certificate chain and private key. Tomcat 8.5+ supports PKCS#12 natively.
          For legacy Tomcat, use the <code className="text-amber-400 font-mono text-xs">keytool</code> command below to convert to <code className="text-amber-400 font-mono text-xs">.jks</code>.
        </div>

        <FileField label="Certificate" hint="certificate.crt"
          accept=".crt,.pem,.cer" file={certFile} onFile={setCertFile} inputRef={certRef} />

        <ChainInputs state={chain} onChange={patch => setChain(s => ({ ...s, ...patch }))} />

        <FileField label="Private Key" hint="commercial.key"
          accept=".key,.pem" file={keyFile} onFile={setKeyFile} inputRef={keyRef} />
        <PassphraseField label="Keystore Password" value={passphrase} onChange={setPassphrase}
          placeholder='Default: changeit (Tomcat standard)' />

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={legacy} onChange={e => setLegacy(e.target.checked)}
            className="mt-0.5 accent-primary" />
          <span className="text-sm text-slate-300">
            Legacy Mode (3DES)
            <span className="block text-xs text-muted mt-0.5">
              For Tomcat &lt; 8.5, JDK &lt; 9, or servers that do not support AES-256.
              Equivalent to <code className="font-mono text-[11px]">openssl pkcs12 -export -legacy</code>.
            </span>
          </span>
        </label>

        <button onClick={handleBuild} disabled={loading || !certFile || !chainReady(chain) || !keyFile}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {loading ? 'Building...' : 'Build & Download keystore.p12'}
        </button>
      </div>

      {error && <div className="bg-surface border border-red-800 rounded-xl p-4 text-red-400 text-sm mb-4">{error}</div>}

      {/* Config snippets — always visible so user can see what to do */}
      <div className={`space-y-4 transition-opacity ${done ? 'opacity-100' : 'opacity-60'}`}>
        {done && (
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <span>✓</span> keystore.p12 downloaded. Copy one of the configurations below.
          </div>
        )}

        {/* PKCS12 config */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div>
              <span className="text-slate-200 text-sm font-semibold">Tomcat — PKCS#12</span>
              <span className="ml-2 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded">Recommended · Tomcat 8.5+</span>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-muted text-xs mb-3">Edit <code className="font-mono">conf/server.xml</code>, add or replace the HTTPS Connector:</p>
            <CodeBlock>{`<Connector port="443"
           protocol="org.apache.coyote.http11.Http11NioProtocol"
           SSLEnabled="true"
           maxThreads="150"
           scheme="https" secure="true">
  <SSLHostConfig>
    <Certificate certificateKeystoreFile="/opt/tomcat/conf/keystore.p12"
                 certificateKeystorePassword="${pass}"
                 certificateKeystoreType="PKCS12"
                 type="RSA" />
  </SSLHostConfig>
</Connector>`}</CodeBlock>
          </div>
        </div>

        {/* keytool to JKS */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <span className="text-slate-200 text-sm font-semibold">Convert to JKS</span>
            <span className="ml-2 text-xs text-muted bg-border px-1.5 py-0.5 rounded">Legacy · requires Java keytool</span>
          </div>
          <div className="px-5 py-4">
            <p className="text-muted text-xs mb-3">Run on server (requires Java installed):</p>
            <CodeBlock>{`keytool -importkeystore \\
  -srckeystore  keystore.p12 \\
  -srcstoretype  PKCS12 \\
  -srcstorepass  ${pass} \\
  -destkeystore  keystore.jks \\
  -deststoretype JKS \\
  -deststorepass ${pass} \\
  -noprompt`}</CodeBlock>
          </div>
        </div>

        {/* JKS config */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <span className="text-slate-200 text-sm font-semibold">Tomcat — JKS</span>
            <span className="ml-2 text-xs text-muted bg-border px-1.5 py-0.5 rounded">Legacy · Tomcat &lt; 8.5</span>
          </div>
          <div className="px-5 py-4">
            <CodeBlock>{`<Connector port="443"
           protocol="org.apache.coyote.http11.Http11NioProtocol"
           SSLEnabled="true"
           scheme="https" secure="true">
  <SSLHostConfig>
    <Certificate certificateKeystoreFile="/opt/tomcat/conf/keystore.jks"
                 certificateKeystorePassword="${pass}"
                 type="RSA" />
  </SSLHostConfig>
</Connector>`}</CodeBlock>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <CliHint command={(() => {
          const cert = certFile?.name ?? 'certificate.crt'
          const key = keyFile?.name ?? 'commercial.key'
          if (chain.chainMode === 'split') {
            const iPart = chain.intermediateFile ? ` --intermediate ${chain.intermediateFile.name}` : ''
            const rPart = chain.rootcaFile ? ` --rootca ${chain.rootcaFile.name}` : ''
            return `ssl-tools tomcat ${cert} --key ${key}${iPart}${rPart} --passphrase ${pass}${legacy ? ' --legacy' : ''}`
          }
          const b = chain.bundleFile?.name ?? 'ca_bundle.crt'
          return `ssl-tools tomcat ${cert} --key ${key} --bundle ${b} --passphrase ${pass}${legacy ? ' --legacy' : ''}`
        })()} />
      </div>
    </>
  )
}

// ─── Tab: Private Key ──────────────────────────────────────────────────────

type KeyAction = 'decrypt' | 'encrypt'

function KeyTab() {
  const [action, setAction]       = useState<KeyAction>('decrypt')
  const [keyFile, setKeyFile]     = useState<File | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const keyRef = useRef<HTMLInputElement>(null)

  const handleAction = async () => {
    if (!keyFile || !passphrase) return
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('mode', 'key')
    fd.append('action', action)
    fd.append('key', keyFile)
    fd.append('passphrase', passphrase)
    const res = await fetch('/api/ssl-converter', { method: 'POST', body: fd })
    if (!res.ok) { setError((await res.json()).error ?? 'Failed'); setLoading(false); return }
    const blob = await res.blob()
    const fn = res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ?? 'private.key'
    downloadBlob(blob, fn)
    setLoading(false)
  }

  const switchAction = (a: KeyAction) => {
    setAction(a); setKeyFile(null); setPassphrase(''); setError('')
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-5 space-y-5 mb-5">
        <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 text-sm text-slate-300 leading-relaxed">
          Remove the passphrase from an encrypted <code className="text-primary-light font-mono text-xs">commercial.key</code> (decrypt),
          or add a passphrase to a plain private key (encrypt).
        </div>

        {/* Action toggle */}
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-2">Operation</label>
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-sm">
            {([
              { id: 'decrypt', label: '🔓 Remove Passphrase' },
              { id: 'encrypt', label: '🔒 Add Passphrase' },
            ] as { id: KeyAction; label: string }[]).map((opt, i) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => switchAction(opt.id)}
                className={`px-4 py-2 transition-colors ${i > 0 ? 'border-l border-border' : ''} ${
                  action === opt.id
                    ? 'bg-primary/20 text-primary-light'
                    : 'text-subtle hover:text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <FileField
          label="Private Key File"
          hint={action === 'decrypt' ? 'commercial.key — encrypted key' : 'private.key — unencrypted key'}
          accept=".key,.pem"
          file={keyFile}
          onFile={setKeyFile}
          inputRef={keyRef}
        />

        <PassphraseField
          label={action === 'decrypt' ? 'Current Passphrase' : 'New Passphrase'}
          value={passphrase}
          onChange={setPassphrase}
          placeholder={action === 'decrypt' ? 'Enter the current key passphrase' : 'New passphrase for the key'}
        />

        <button
          onClick={handleAction}
          disabled={loading || !keyFile || !passphrase}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading
            ? 'Processing...'
            : action === 'decrypt'
              ? 'Decrypt & Download private.key'
              : 'Encrypt & Download private_encrypted.key'}
        </button>
      </div>

      {error && <div className="bg-surface border border-red-800 rounded-xl p-4 text-red-400 text-sm mb-4">{error}</div>}

      <CliHint command={
        action === 'decrypt'
          ? `ssl-tools key ${keyFile?.name ?? 'commercial.key'} --decrypt --passphrase your_passphrase`
          : `ssl-tools key ${keyFile?.name ?? 'private.key'} --encrypt --passphrase your_passphrase`
      } />
    </>
  )
}
