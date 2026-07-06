'use client'
import { useState } from 'react'
import ToolPageLayout from '@/components/ToolPageLayout'
import FileUploadArea from '@/components/FileUploadArea'
import CliHint from '@/components/CliHint'

type Mode = 'generate-key' | 'existing-key'
type KeyAlgorithm = 'ecdsa-p384' | 'ecdsa-p256' | 'ecdsa-p521' | 'rsa-2048' | 'rsa-4096'

interface CreatorResult {
  csrPem: string
  privateKeyPem?: string
  keyAlgorithm: string
  signatureAlgorithm: string
}

const ALGORITHMS: { value: KeyAlgorithm; label: string; hint: string }[] = [
  { value: 'ecdsa-p384', label: 'ECDSA P-384', hint: 'Default, strong modern choice' },
  { value: 'ecdsa-p256', label: 'ECDSA P-256', hint: 'Modern and widely supported' },
  { value: 'ecdsa-p521', label: 'ECDSA P-521', hint: 'Highest ECDSA strength' },
  { value: 'rsa-2048', label: 'RSA 2048', hint: 'Maximum compatibility' },
  { value: 'rsa-4096', label: 'RSA 4096', hint: 'Stronger RSA, larger key' },
]

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/x-pem-file' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function shellArg(value: string) {
  return /^[A-Za-z0-9_./:@%+=,-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", "'\\''")}'`
}

function OutputBlock({ title, filename, value }: { title: string; filename: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <h3 className="text-slate-200 font-semibold">{title}</h3>
        <button
          type="button"
          onClick={() => downloadText(filename, value)}
          className="border border-border text-slate-300 px-3 py-1.5 rounded-lg text-sm hover:border-primary transition-colors"
        >
          Download
        </button>
      </div>
      <pre className="px-4 py-3 text-xs text-slate-400 font-mono overflow-auto max-h-80 whitespace-pre-wrap break-all">{value}</pre>
    </div>
  )
}

export default function CsrCreatorPage() {
  const [mode, setMode] = useState<Mode>('generate-key')
  const [keyAlgorithm, setKeyAlgorithm] = useState<KeyAlgorithm>('ecdsa-p384')
  const [commonName, setCommonName] = useState('')
  const [sans, setSans] = useState('')
  const [organization, setOrganization] = useState('')
  const [organizationalUnit, setOrganizationalUnit] = useState('')
  const [country, setCountry] = useState('')
  const [stateName, setStateName] = useState('')
  const [locality, setLocality] = useState('')
  const [email, setEmail] = useState('')
  const [encryptPrivateKey, setEncryptPrivateKey] = useState(false)
  const [privateKeyPassword, setPrivateKeyPassword] = useState('')
  const [existingPrivateKeyPem, setExistingPrivateKeyPem] = useState('')
  const [result, setResult] = useState<CreatorResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!commonName.trim()) return
    setLoading(true); setError(''); setResult(null)
    const res = await fetch('/api/csr-creator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        keyAlgorithm,
        commonName,
        sans,
        organization,
        organizationalUnit,
        country,
        state: stateName,
        locality,
        email,
        encryptPrivateKey,
        privateKeyPassword,
        existingPrivateKeyPem,
      }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else setResult(data)
    setLoading(false)
  }

  const needsPassword = encryptPrivateKey || mode === 'existing-key'
  const cliCommand = (() => {
    const args = ['ssl-tools', 'create-csr', '--cn', shellArg(commonName.trim() || 'example.com')]

    if (mode === 'generate-key') {
      args.push('--key-algorithm', keyAlgorithm)
      if (encryptPrivateKey) {
        args.push('--encrypt-key', '--passphrase', '<passphrase>')
      }
    } else {
      args.push('--key', 'private.key')
      if (privateKeyPassword) {
        args.push('--passphrase', '<passphrase>')
      }
    }

    sans
      .split(/[\n,]+/)
      .map(value => value.trim())
      .filter(Boolean)
      .forEach(value => args.push('--san', shellArg(value)))

    const optionalArgs: [string, string][] = [
      ['--organization', organization],
      ['--organizational-unit', organizationalUnit],
      ['--country', country],
      ['--state', stateName],
      ['--locality', locality],
      ['--email', email],
    ]
    optionalArgs
      .map(([flag, value]) => [flag, value.trim()] as [string, string])
      .filter(([, value]) => value)
      .forEach(([flag, value]) => args.push(flag, shellArg(value)))

    return args.join(' ')
  })()

  return (
    <ToolPageLayout icon="🧾" title="CSR Creator" description="Create a CSR with a new private key or an uploaded private key.">
      <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
        <div className="flex gap-2 flex-wrap">
          {([
            { id: 'generate-key', label: 'Generate CSR + Private Key' },
            { id: 'existing-key', label: 'CSR from Uploaded Key' },
          ] as { id: Mode; label: string }[]).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { setMode(opt.id); setResult(null); setError('') }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === opt.id
                  ? 'bg-primary border-primary text-white'
                  : 'border-border text-subtle hover:border-primary/60 hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {mode === 'generate-key' ? (
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Key Algorithm</label>
            <select
              value={keyAlgorithm}
              onChange={e => setKeyAlgorithm(e.target.value as KeyAlgorithm)}
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary"
            >
              {ALGORITHMS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label} - {opt.hint}</option>
              ))}
            </select>
          </div>
        ) : (
          <FileUploadArea
            value={existingPrivateKeyPem}
            onChange={setExistingPrivateKeyPem}
            placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
            label="Private Key (PEM)"
            accept=".key,.pem,.txt"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Common Name</label>
            <input value={commonName} onChange={e => setCommonName(e.target.value)} placeholder="example.com"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Organization</label>
            <input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Company Ltd"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Organizational Unit (OU)</label>
            <input value={organizationalUnit} onChange={e => setOrganizationalUnit(e.target.value)} placeholder="IT"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Country Code (C)</label>
            <input value={country} onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder="ID" maxLength={2}
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">State / Province</label>
            <input value={stateName} onChange={e => setStateName(e.target.value)} placeholder="Jawa Barat"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Locality</label>
            <input value={locality} onChange={e => setLocality(e.target.value)} placeholder="Bekasi"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="md:col-span-2">
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>

        <div>
          <label className="text-slate-300 text-sm font-medium block mb-1.5">SANs</label>
          <textarea
            value={sans}
            onChange={e => setSans(e.target.value)}
            placeholder="example.com&#10;www.example.com&#10;*.example.com"
            rows={4}
            className="w-full bg-bg border border-border rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:border-primary placeholder:text-muted"
          />
        </div>

        <div className="space-y-3">
          {mode === 'generate-key' && (
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={encryptPrivateKey}
                onChange={e => setEncryptPrivateKey(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Encrypt generated private key with password
            </label>
          )}
          {needsPassword && (
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1.5">
                {mode === 'existing-key' ? 'Private Key Password (if encrypted)' : 'Private Key Password'}
              </label>
              <input
                value={privateKeyPassword}
                onChange={e => setPrivateKeyPassword(e.target.value)}
                type="password"
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !commonName.trim() || (mode === 'existing-key' && !existingPrivateKeyPem.trim()) || (encryptPrivateKey && !privateKeyPassword)}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create CSR'}
        </button>
      </div>

      {error && <div className="bg-surface border border-red-800 rounded-xl p-5 mt-4 text-red-400">{error}</div>}

      {result && (
        <div className="mt-4 space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <dt className="text-muted text-xs mb-1">Key Algorithm</dt>
                <dd className="text-slate-200 text-sm">{result.keyAlgorithm}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs mb-1">Signature Algorithm</dt>
                <dd className="text-slate-200 text-sm">{result.signatureAlgorithm}</dd>
              </div>
            </dl>
          </div>
          <OutputBlock title="CSR" filename="certificate.csr" value={result.csrPem} />
          {result.privateKeyPem && <OutputBlock title="Private Key" filename="private.key" value={result.privateKeyPem} />}
        </div>
      )}

      <CliHint command={cliCommand} />
    </ToolPageLayout>
  )
}
