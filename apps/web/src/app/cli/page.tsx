import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Install CLI — SSL Certificate Tools',
  description: 'Install ssl-tools CLI for Linux, macOS, and Windows. Full-featured SSL toolkit in your terminal.',
}

const platforms = [
  {
    name: 'macOS (Apple Silicon)',
    icon: '',
    file: 'ssl-tools-aarch64-apple-darwin',
    tag: 'arm64',
  },
  {
    name: 'macOS (Intel)',
    icon: '',
    file: 'ssl-tools-x86_64-apple-darwin',
    tag: 'x86_64',
  },
  {
    name: 'Linux (x86_64)',
    icon: '🐧',
    file: 'ssl-tools-x86_64-unknown-linux-gnu',
    tag: 'x86_64',
  },
  {
    name: 'Windows (x86_64)',
    icon: '🪟',
    file: 'ssl-tools-x86_64-pc-windows-msvc.exe',
    tag: 'x86_64',
  },
]

const commands = [
  {
    title: 'SSL Checker',
    description: 'Cek status dan detail sertifikat live dari domain.',
    examples: [
      'ssl-tools check example.com',
      'ssl-tools check example.com --port 8443',
      'ssl-tools check example.com --json',
    ],
  },
  {
    title: 'CSR Decoder',
    description: 'Decode Certificate Signing Request dari file .csr.',
    examples: [
      'ssl-tools decode-csr request.csr',
      'ssl-tools decode-csr request.csr --json',
    ],
  },
  {
    title: 'Certificate Decoder',
    description: 'Parse sertifikat X.509 (PEM atau DER).',
    examples: [
      'ssl-tools decode-cert certificate.crt',
      'ssl-tools decode-cert certificate.der --json',
    ],
  },
  {
    title: 'Key Matcher',
    description: 'Verifikasi apakah private key cocok dengan sertifikat.',
    examples: [
      'ssl-tools match certificate.crt private.key',
      'ssl-tools match certificate.crt private.key --json',
    ],
  },
  {
    title: 'SSL Converter',
    description: 'Konversi format sertifikat: PEM ↔ DER ↔ PFX, serta baca P7B.',
    examples: [
      'ssl-tools convert cert.pem --to der',
      'ssl-tools convert cert.pem --to pfx --key private.key --passphrase secret',
      'ssl-tools convert bundle.pfx --to pem --passphrase secret',
      'ssl-tools convert chain.p7b --to pem',
    ],
  },
  {
    title: 'Build PEM Bundle',
    description: 'Gabungkan key + cert + CA chain menjadi fullchain.pem (urutan: key → cert → intermediate → rootca).',
    examples: [
      'ssl-tools bundle certificate.crt --bundle ca_bundle.crt',
      'ssl-tools bundle certificate.crt --intermediate int.crt --rootca root.crt',
      'ssl-tools bundle certificate.crt --bundle ca_bundle.crt --key commercial.key',
      'ssl-tools bundle certificate.crt --bundle ca_bundle.crt -o /etc/nginx/ssl/fullchain.pem',
    ],
  },
  {
    title: 'Tomcat Keystore',
    description: 'Build PKCS#12 keystore berisi full chain — siap dipakai di Tomcat 8.5+.',
    examples: [
      'ssl-tools tomcat certificate.crt --key commercial.key --bundle ca_bundle.crt',
      'ssl-tools tomcat certificate.crt --key commercial.key --bundle ca_bundle.crt --passphrase changeit',
      'ssl-tools tomcat certificate.crt --key commercial.key --intermediate int.crt --rootca root.crt',
    ],
  },
  {
    title: 'Private Key Convert',
    description: 'Hapus passphrase dari encrypted key, atau tambah passphrase ke unencrypted key.',
    examples: [
      'ssl-tools key commercial.key --decrypt --passphrase current_pass',
      'ssl-tools key private.key --encrypt --passphrase new_pass',
      'ssl-tools key commercial.key --decrypt --passphrase current_pass -o plain.key',
    ],
  },
]

export default function CliPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="flex items-center gap-2 mb-10 text-sm text-subtle">
        <Link href="/" className="hover:text-slate-300 transition-colors">SSL Tools</Link>
        <span>/</span>
        <span className="text-primary-light">CLI</span>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">⌨️</span>
          <h1 className="text-3xl font-extrabold text-slate-200">ssl-tools CLI</h1>
        </div>
        <p className="text-subtle max-w-xl">
          Binary ringan untuk Linux, macOS, dan Windows. Output plain text atau JSON — sempurna untuk scripting dan pipeline CI/CD.
        </p>
      </div>

      {/* Install via Cargo */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Install via Cargo</h2>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-subtle text-sm mb-3">
            Butuh <a href="https://rustup.rs" target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline">Rust toolchain</a> terinstall:
          </p>
          <pre className="bg-bg border border-border rounded-lg px-4 py-3 text-sm font-mono text-green-400 overflow-x-auto">
            <span className="text-subtle select-none">$ </span>cargo install ssl-tools
          </pre>
          <p className="text-muted text-xs mt-2">
            ⚠️ Belum dipublish ke crates.io — gunakan <span className="text-primary-light">Download Binary</span> di bawah untuk sekarang.
          </p>
        </div>
      </section>

      {/* Download Binary */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Download Binary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {platforms.map((p) => (
            <a
              key={p.file}
              href={`https://github.com/nugiabdiansyah/ssl-certificate-tools/releases/latest/download/${p.file}`}
              className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-4 hover:border-primary transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <div>
                  <div className="text-slate-200 text-sm font-medium group-hover:text-primary-light transition-colors">{p.name}</div>
                  <div className="text-muted text-xs font-mono mt-0.5">{p.file}</div>
                </div>
              </div>
              <span className="text-subtle text-xs bg-border px-2 py-1 rounded">{p.tag}</span>
            </a>
          ))}
        </div>
        <p className="text-muted text-xs mt-3">
          Semua release tersedia di{' '}
          <a
            href="https://github.com/nugiabdiansyah/ssl-certificate-tools/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-light hover:underline"
          >
            GitHub Releases
          </a>
          .
        </p>
      </section>

      {/* Quick Start */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Quick Start</h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-border text-xs text-muted font-mono">bash</div>
          <pre className="px-5 py-4 text-sm font-mono text-slate-300 overflow-x-auto leading-relaxed">{`# Cek SSL domain
ssl-tools check google.com

# Decode sertifikat
ssl-tools decode-cert certificate.crt

# Build fullchain.pem
ssl-tools bundle certificate.crt --bundle ca_bundle.crt --key commercial.key

# Build Tomcat keystore
ssl-tools tomcat certificate.crt --key commercial.key --bundle ca_bundle.crt

# Hapus passphrase dari private key
ssl-tools key commercial.key --decrypt --passphrase your_passphrase

# Output JSON untuk scripting
ssl-tools check example.com --json | jq '.validTo'`}</pre>
        </div>
      </section>

      {/* Commands Reference */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-slate-200 mb-6">Referensi Perintah</h2>
        <div className="space-y-4">
          {commands.map((cmd) => (
            <div key={cmd.title} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-start gap-3">
                <div>
                  <div className="text-slate-200 font-semibold">{cmd.title}</div>
                  <div className="text-subtle text-sm mt-0.5">{cmd.description}</div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2">
                {cmd.examples.map((ex) => (
                  <div key={ex} className="flex items-center gap-2">
                    <span className="text-primary-light text-xs font-mono select-none">$</span>
                    <code className="text-green-400 text-sm font-mono">{ex}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* JSON Flag */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Output JSON</h2>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-subtle text-sm mb-4">
            Semua perintah mendukung flag <code className="bg-border text-primary-light px-1.5 py-0.5 rounded text-xs font-mono">--json</code> untuk output machine-readable:
          </p>
          <pre className="bg-bg border border-border rounded-lg px-4 py-3 text-sm font-mono overflow-x-auto leading-relaxed">
            <span className="text-subtle">$ </span><span className="text-green-400">ssl-tools check google.com --json | jq .</span>{'\n'}
            <span className="text-slate-400">{`{
  "domain": "google.com",
  "status": "valid",
  "daysRemaining": 68,
  "issuer": "WR2",
  "validFrom": "2025-04-14",
  "validTo": "2025-07-07",
  "protocol": "TLSv1.3",
  "sans": ["*.google.com", "google.com"]
}`}</span>
          </pre>
        </div>
      </section>

      {/* Source */}
      <section>
        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-slate-200 font-semibold mb-1">Open Source</div>
            <div className="text-subtle text-sm">Source code tersedia di GitHub. Kontribusi, issue, dan PR selalu welcome.</div>
          </div>
          <a
            href="https://github.com/nugiabdiansyah/ssl-certificate-tools"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors text-sm"
          >
            Lihat di GitHub →
          </a>
        </div>
      </section>
    </div>
  )
}
