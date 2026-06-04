# SSL Certificate Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun monorepo SSL Certificate Tools dengan web app (Next.js 14) dan CLI (Rust) yang menyediakan SSL Checker, CSR Decoder, Certificate Decoder, Key Matcher, dan SSL Converter.

**Architecture:** Monorepo dengan pnpm workspaces + Turborepo. Web app menggunakan Next.js App Router dengan semua crypto logic di server-side API Routes (node-forge + tls.connect). CLI adalah Rust binary independen dengan library crypto native.

**Tech Stack:** Next.js 14, React, Tailwind CSS, node-forge, Rust, clap, x509-parser, native-tls, pnpm, Turborepo

---

## File Structure

```
ssl-certificate-tools/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── globals.css
│   │   │   │   ├── ssl-checker/page.tsx
│   │   │   │   ├── csr-decoder/page.tsx
│   │   │   │   ├── cert-decoder/page.tsx
│   │   │   │   ├── key-matcher/page.tsx
│   │   │   │   ├── ssl-converter/page.tsx
│   │   │   │   └── api/
│   │   │   │       ├── ssl-checker/route.ts
│   │   │   │       ├── csr-decoder/route.ts
│   │   │   │       ├── cert-decoder/route.ts
│   │   │   │       ├── key-matcher/route.ts
│   │   │   │       └── ssl-converter/route.ts
│   │   │   ├── components/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── ToolCard.tsx
│   │   │   │   ├── ToolPageLayout.tsx
│   │   │   │   ├── ResultCard.tsx
│   │   │   │   ├── FileUploadArea.tsx
│   │   │   │   └── CliHint.tsx
│   │   │   └── lib/
│   │   │       ├── ssl-checker.ts
│   │   │       ├── csr-decoder.ts
│   │   │       ├── cert-decoder.ts
│   │   │       ├── key-matcher.ts
│   │   │       └── ssl-converter.ts
│   │   ├── __tests__/
│   │   │   ├── fixtures/index.ts
│   │   │   └── lib/
│   │   │       ├── ssl-checker.test.ts
│   │   │       ├── csr-decoder.test.ts
│   │   │       ├── cert-decoder.test.ts
│   │   │       ├── key-matcher.test.ts
│   │   │       └── ssl-converter.test.ts
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── jest.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── cli/
│       ├── src/
│       │   ├── main.rs
│       │   ├── commands/
│       │   │   ├── mod.rs
│       │   │   ├── check.rs
│       │   │   ├── decode_csr.rs
│       │   │   ├── decode_cert.rs
│       │   │   ├── match_key.rs
│       │   │   └── convert.rs
│       │   └── output.rs
│       ├── tests/
│       │   └── integration_test.rs
│       └── Cargo.toml
├── .github/workflows/
│   ├── web-deploy.yml
│   └── cli-release.yml
├── turbo.json
├── pnpm-workspace.yaml
├── .gitignore
└── README.md
```

---

## Task 1: Monorepo Foundation

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Install pnpm dan inisialisasi git**

```bash
git init
npm install -g pnpm turbo
```

- [ ] **Step 2: Buat `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Buat `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "outputs": ["coverage/**"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 4: Buat `package.json` root**

```json
{
  "name": "ssl-certificate-tools",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 5: Buat `.gitignore`**

```
node_modules/
.next/
dist/
target/
.turbo/
coverage/
*.pem
*.key
*.p12
*.pfx
.env
.env.local
.superpowers/
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo with pnpm workspaces and turborepo"
```

---

## Task 2: Next.js Web App Setup

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/jest.config.ts`
- Create: `apps/web/src/app/globals.css`

- [ ] **Step 1: Buat Next.js app**

```bash
cd apps
pnpm create next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias
cd ..
```

- [ ] **Step 2: Install dependencies web**

```bash
cd apps/web
pnpm add node-forge
pnpm add -D @types/node-forge jest jest-environment-node @types/jest ts-jest @testing-library/react @testing-library/jest-dom
cd ../..
```

- [ ] **Step 3: Buat `apps/web/jest.config.ts`**

```typescript
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.json' }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
}

export default config
```

- [ ] **Step 4: Update `apps/web/tailwind.config.ts` dengan custom colors**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#111126',
        border: '#1e1e3a',
        primary: '#6366f1',
        'primary-light': '#818cf8',
        muted: '#475569',
        subtle: '#64748b',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: Ganti `apps/web/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0a0a0f;
  --surface: #111126;
  --border: #1e1e3a;
  --primary: #6366f1;
  --primary-light: #818cf8;
}

body {
  background-color: var(--bg);
  color: #e2e8f0;
}
```

- [ ] **Step 6: Verifikasi dev server berjalan**

```bash
cd apps/web && pnpm dev
```

Buka http://localhost:3000 — pastikan Next.js default page muncul.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): initialize Next.js 14 app with Tailwind dark theme"
```

---

## Task 3: Shared UI Components

**Files:**
- Create: `apps/web/src/components/Navbar.tsx`
- Create: `apps/web/src/components/Footer.tsx`
- Create: `apps/web/src/components/ToolCard.tsx`
- Create: `apps/web/src/components/ToolPageLayout.tsx`
- Create: `apps/web/src/components/ResultCard.tsx`
- Create: `apps/web/src/components/FileUploadArea.tsx`
- Create: `apps/web/src/components/CliHint.tsx`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Buat `Navbar.tsx`**

```tsx
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-sm">🔒</div>
        <span className="font-bold text-slate-200">SSL Tools</span>
      </Link>
      <div className="flex items-center gap-6">
        <Link href="/#tools" className="text-subtle text-sm hover:text-slate-300 transition-colors">Tools</Link>
        <Link href="/cli" className="text-subtle text-sm hover:text-slate-300 transition-colors">CLI</Link>
        <a href="https://github.com/yourusername/ssl-certificate-tools" target="_blank" rel="noopener noreferrer"
          className="bg-primary text-white text-sm px-4 py-1.5 rounded-md hover:bg-indigo-500 transition-colors">
          GitHub
        </a>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Buat `Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="border-t border-border mt-20 px-6 py-8 text-center">
      <p className="text-subtle text-sm">
        All processing is done server-side and no data is stored or logged.
      </p>
      <p className="text-muted text-xs mt-2">
        Open source · MIT License
      </p>
    </footer>
  )
}
```

- [ ] **Step 3: Buat `ToolCard.tsx`**

```tsx
import Link from 'next/link'

interface ToolCardProps {
  icon: string
  title: string
  description: string
  href: string
  featured?: boolean
}

export default function ToolCard({ icon, title, description, href, featured }: ToolCardProps) {
  return (
    <Link href={href}
      className={`block rounded-xl p-5 border transition-all hover:border-primary-light hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] group
        ${featured ? 'border-primary bg-surface' : 'border-border bg-surface'}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-bold text-slate-200 group-hover:text-primary-light transition-colors">{title}</h3>
      </div>
      <p className="text-subtle text-sm leading-relaxed">{description}</p>
      <span className="mt-4 inline-block text-primary-light text-sm font-medium">Use tool →</span>
    </Link>
  )
}
```

- [ ] **Step 4: Buat `ToolPageLayout.tsx`**

```tsx
import Link from 'next/link'

interface ToolPageLayoutProps {
  icon: string
  title: string
  description: string
  children: React.ReactNode
}

export default function ToolPageLayout({ icon, title, description, children }: ToolPageLayoutProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-8 text-sm text-subtle">
        <Link href="/" className="hover:text-slate-300 transition-colors">SSL Tools</Link>
        <span>/</span>
        <span className="text-primary-light">{title}</span>
      </div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{icon}</span>
          <h1 className="text-2xl font-bold text-slate-200">{title}</h1>
        </div>
        <p className="text-subtle">{description}</p>
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Buat `ResultCard.tsx`**

```tsx
interface ResultRow { label: string; value: string | string[] }

interface ResultCardProps {
  status?: 'success' | 'error' | 'warning'
  statusText?: string
  rows: ResultRow[]
}

export default function ResultCard({ status, statusText, rows }: ResultCardProps) {
  const statusColor = { success: 'text-green-400', error: 'text-red-400', warning: 'text-yellow-400' }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 mt-4">
      {statusText && (
        <div className={`flex items-center gap-2 mb-4 pb-4 border-b border-border font-semibold ${statusColor[status ?? 'success']}`}>
          <span>{status === 'success' ? '✓' : status === 'error' ? '✗' : '⚠'}</span>
          {statusText}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3">
        {rows.map(({ label, value }) => (
          <div key={label} className={Array.isArray(value) ? 'col-span-2' : ''}>
            <dt className="text-muted text-xs mb-1">{label}</dt>
            <dd className="text-slate-200 text-sm">
              {Array.isArray(value)
                ? <div className="flex flex-wrap gap-1">{value.map(v => <span key={v} className="bg-border text-primary-light text-xs px-2 py-0.5 rounded">{v}</span>)}</div>
                : value
              }
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
```

- [ ] **Step 6: Buat `FileUploadArea.tsx`**

```tsx
'use client'
import { useRef } from 'react'

interface FileUploadAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  accept?: string
  label: string
}

export default function FileUploadArea({ value, onChange, placeholder, accept = '.pem,.crt,.csr,.der,.key', label }: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target?.result as string)
    reader.readAsText(file)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-slate-300 text-sm font-medium">{label}</label>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="text-primary-light text-xs hover:underline">Upload file</button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full bg-bg border border-border rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:border-primary placeholder:text-muted"
      />
    </div>
  )
}
```

- [ ] **Step 7: Buat `CliHint.tsx`**

```tsx
'use client'
import { useState } from 'react'

export default function CliHint({ command }: { command: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-6 bg-bg border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left flex items-center justify-between text-subtle text-sm hover:text-slate-300 transition-colors">
        <span>CLI equivalent</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-border">
          <code className="text-primary-light text-sm font-mono">{command}</code>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Update `apps/web/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SSL Certificate Tools — Free SSL Utilities for Developers',
  description: 'Free, open-source SSL tools: SSL Checker, CSR Decoder, Certificate Decoder, Key Matcher, SSL Converter. No data stored.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-bg min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components apps/web/src/app/layout.tsx
git commit -m "feat(web): add shared UI components (Navbar, Footer, ToolCard, etc.)"
```

---

## Task 4: Homepage

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Tulis `apps/web/src/app/page.tsx`**

```tsx
import ToolCard from '@/components/ToolCard'

const tools = [
  { icon: '🔍', title: 'SSL Checker', description: 'Cek status dan detail sertifikat SSL dari domain yang aktif secara langsung.', href: '/ssl-checker' },
  { icon: '📄', title: 'CSR Decoder', description: 'Decode Certificate Signing Request dan tampilkan semua field di dalamnya.', href: '/csr-decoder' },
  { icon: '🔐', title: 'Certificate Decoder', description: 'Parse sertifikat X.509 (PEM/DER) dan tampilkan informasi lengkap.', href: '/cert-decoder' },
  { icon: '🔑', title: 'Key Matcher', description: 'Verifikasi apakah private key cocok dengan sertifikat yang dimiliki.', href: '/key-matcher' },
  { icon: '🔄', title: 'SSL Converter', description: 'Konversi format sertifikat: PEM ↔ DER ↔ PFX/P12 dengan mudah.', href: '/ssl-converter' },
]

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <p className="text-xs text-primary-light tracking-widest font-semibold mb-4 uppercase">SSL Certificate Tools</p>
        <h1 className="text-4xl font-extrabold text-slate-200 mb-4">
          Free SSL Utilities<br />
          <span className="text-primary-light">for Developers</span>
        </h1>
        <p className="text-subtle max-w-md mx-auto mb-8">
          Decode, verify, and convert SSL certificates online. No data stored. Open source.
        </p>
        <div className="flex justify-center gap-3">
          <a href="#tools" className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors">
            Browse Tools
          </a>
          <a href="/cli" className="border border-border text-slate-300 px-6 py-2.5 rounded-lg hover:border-slate-500 transition-colors">
            Install CLI
          </a>
        </div>
      </div>

      {/* Tools Grid */}
      <div id="tools" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.slice(0, 4).map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
        <div className="md:col-span-2">
          <ToolCard {...tools[4]} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Jalankan dev server dan cek homepage**

```bash
cd apps/web && pnpm dev
```

Buka http://localhost:3000 — pastikan hero dan grid 5 tools tampil dengan benar.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(web): add homepage with hero section and tools grid"
```

---

## Task 5: Test Fixtures

**Files:**
- Create: `apps/web/__tests__/fixtures/index.ts`

- [ ] **Step 1: Buat fixture generator**

```typescript
// apps/web/__tests__/fixtures/index.ts
import forge from 'node-forge'

function generateFixtures() {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date('2024-01-01')
  cert.validity.notAfter = new Date('2025-01-01')
  const attrs = [
    { name: 'commonName', value: 'test.example.com' },
    { name: 'organizationName', value: 'Test Org' },
    { name: 'countryName', value: 'ID' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([
    { name: 'subjectAltName', altNames: [{ type: 2, value: 'test.example.com' }, { type: 2, value: 'www.test.example.com' }] },
  ])
  cert.sign(keys.privateKey, forge.md.sha256.create())

  const csr = forge.pki.createCertificationRequest()
  csr.publicKey = keys.publicKey
  csr.setSubject(attrs)
  csr.sign(keys.privateKey)

  return {
    certPem: forge.pki.certificateToPem(cert),
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    publicKeyPem: forge.pki.publicKeyToPem(keys.publicKey),
    csrPem: forge.pki.certificationRequestToPem(csr),
    otherKeys: forge.pki.rsa.generateKeyPair(2048),
  }
}

export const fixtures = generateFixtures()
```

- [ ] **Step 2: Verifikasi fixtures dapat diimport**

```bash
cd apps/web && npx ts-node -e "const {fixtures} = require('./__tests__/fixtures'); console.log('cert CN:', fixtures.certPem.includes('BEGIN CERTIFICATE'))"
```

Expected: `cert CN: true`

- [ ] **Step 3: Commit**

```bash
git add apps/web/__tests__/fixtures
git commit -m "test(web): add shared test fixtures generator"
```

---

## Task 6: SSL Checker — lib + API + page

**Files:**
- Create: `apps/web/src/lib/ssl-checker.ts`
- Create: `apps/web/__tests__/lib/ssl-checker.test.ts`
- Create: `apps/web/src/app/api/ssl-checker/route.ts`
- Create: `apps/web/src/app/ssl-checker/page.tsx`

- [ ] **Step 1: Tulis failing test**

```typescript
// apps/web/__tests__/lib/ssl-checker.test.ts
import { parseDomain, buildSslResult } from '@/lib/ssl-checker'

describe('parseDomain', () => {
  it('strips https:// prefix', () => {
    expect(parseDomain('https://example.com')).toBe('example.com')
  })
  it('strips trailing slashes and paths', () => {
    expect(parseDomain('example.com/path')).toBe('example.com')
  })
  it('leaves clean domain unchanged', () => {
    expect(parseDomain('example.com')).toBe('example.com')
  })
})

describe('buildSslResult', () => {
  it('calculates days remaining correctly', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
    const result = buildSslResult({ valid_to: futureDate.toISOString(), valid_from: new Date().toISOString(), subject: { CN: 'test.com' }, issuer: { O: 'Test CA' }, subjectaltname: '', bits: 2048 })
    expect(result.daysRemaining).toBeGreaterThan(9)
    expect(result.status).toBe('valid')
  })
  it('marks expired cert', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const result = buildSslResult({ valid_to: pastDate.toISOString(), valid_from: new Date().toISOString(), subject: { CN: 'test.com' }, issuer: { O: 'Test CA' }, subjectaltname: '', bits: 2048 })
    expect(result.status).toBe('expired')
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

```bash
cd apps/web && pnpm test -- --testPathPattern=ssl-checker
```

Expected: FAIL — `parseDomain` not found

- [ ] **Step 3: Implementasi `src/lib/ssl-checker.ts`**

```typescript
import tls from 'tls'

export interface SslResult {
  status: 'valid' | 'expired' | 'invalid'
  daysRemaining: number
  issuedTo: string
  issuer: string
  validFrom: string
  validTo: string
  algorithm: string
  protocol: string
  sans: string[]
}

export function parseDomain(input: string): string {
  return input.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].trim()
}

export function buildSslResult(cert: {
  valid_to: string
  valid_from: string
  subject: { CN?: string }
  issuer: { O?: string; CN?: string }
  subjectaltname?: string
  bits?: number
}): SslResult {
  const now = Date.now()
  const validTo = new Date(cert.valid_to)
  const daysRemaining = Math.floor((validTo.getTime() - now) / (1000 * 60 * 60 * 24))
  const status = daysRemaining < 0 ? 'expired' : 'valid'

  const sans = cert.subjectaltname
    ? cert.subjectaltname.split(', ').filter(s => s.startsWith('DNS:')).map(s => s.slice(4))
    : []

  return {
    status,
    daysRemaining,
    issuedTo: cert.subject.CN ?? 'Unknown',
    issuer: cert.issuer.O ?? cert.issuer.CN ?? 'Unknown',
    validFrom: new Date(cert.valid_from).toISOString().split('T')[0],
    validTo: validTo.toISOString().split('T')[0],
    algorithm: cert.bits ? `RSA ${cert.bits}-bit` : 'Unknown',
    protocol: 'TLS',
    sans,
  }
}

export async function checkSsl(domain: string, port = 443): Promise<SslResult> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: domain, port, servername: domain, rejectUnauthorized: false },
      () => {
        const raw = socket.getPeerCertificate()
        const protocol = socket.getProtocol() ?? 'TLS'
        socket.end()
        if (!raw || !raw.subject) {
          reject(new Error('No certificate found'))
          return
        }
        const result = buildSslResult(raw as Parameters<typeof buildSslResult>[0])
        result.protocol = protocol
        resolve(result)
      }
    )
    socket.setTimeout(10000, () => { socket.destroy(); reject(new Error('Connection timed out')) })
    socket.on('error', (err) => reject(new Error(`Connection failed: ${err.message}`)))
  })
}
```

- [ ] **Step 4: Jalankan test — pastikan PASS**

```bash
cd apps/web && pnpm test -- --testPathPattern=ssl-checker
```

Expected: PASS (3 tests)

- [ ] **Step 5: Buat API route `src/app/api/ssl-checker/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkSsl, parseDomain } from '@/lib/ssl-checker'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { domain, port } = await req.json()
  if (!domain) return NextResponse.json({ error: 'Domain is required' }, { status: 400 })

  const clean = parseDomain(domain)
  if (!clean) return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })

  try {
    const result = await checkSsl(clean, port ?? 443)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 6: Buat halaman `src/app/ssl-checker/page.tsx`**

```tsx
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
```

- [ ] **Step 7: Test manual di browser**

```bash
cd apps/web && pnpm dev
```

Buka http://localhost:3000/ssl-checker → ketik `google.com` → klik Check SSL → pastikan hasil muncul.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/ssl-checker.ts apps/web/__tests__/lib/ssl-checker.test.ts apps/web/src/app/api/ssl-checker apps/web/src/app/ssl-checker
git commit -m "feat(web): add SSL Checker lib, API route, and page"
```

---

## Task 7: CSR Decoder — lib + API + page

**Files:**
- Create: `apps/web/src/lib/csr-decoder.ts`
- Create: `apps/web/__tests__/lib/csr-decoder.test.ts`
- Create: `apps/web/src/app/api/csr-decoder/route.ts`
- Create: `apps/web/src/app/csr-decoder/page.tsx`

- [ ] **Step 1: Tulis failing test**

```typescript
// apps/web/__tests__/lib/csr-decoder.test.ts
import { decodeCsr } from '@/lib/csr-decoder'
import { fixtures } from '../fixtures'

describe('decodeCsr', () => {
  it('decodes common name from CSR', () => {
    const result = decodeCsr(fixtures.csrPem)
    expect(result.commonName).toBe('test.example.com')
  })
  it('decodes organization from CSR', () => {
    const result = decodeCsr(fixtures.csrPem)
    expect(result.organization).toBe('Test Org')
  })
  it('throws on invalid PEM', () => {
    expect(() => decodeCsr('not a valid csr')).toThrow()
  })
})
```

- [ ] **Step 2: Run test — pastikan GAGAL**

```bash
cd apps/web && pnpm test -- --testPathPattern=csr-decoder
```

- [ ] **Step 3: Implementasi `src/lib/csr-decoder.ts`**

```typescript
import forge from 'node-forge'

export interface CsrInfo {
  commonName: string
  organization: string
  organizationalUnit: string
  country: string
  state: string
  locality: string
  email: string
  publicKeyAlgorithm: string
  publicKeyBits: number
  signatureAlgorithm: string
  sans: string[]
}

function getAttr(csr: forge.pki.CertificationRequest, name: string): string {
  const attr = csr.subject.getField(name)
  return attr ? (attr.value as string) : ''
}

export function decodeCsr(pem: string): CsrInfo {
  const csr = forge.pki.certificationRequestFromPem(pem)
  const pubKey = csr.publicKey as forge.pki.rsa.PublicKey
  const bits = pubKey.n?.bitLength() ?? 0
  const sans: string[] = []

  try {
    const ext = csr.getAttribute({ name: 'extensionRequest' })
    if (ext && ext.extensions) {
      const sanExt = ext.extensions.find((e: { name: string }) => e.name === 'subjectAltName') as { altNames?: { type: number; value: string }[] } | undefined
      if (sanExt?.altNames) {
        sans.push(...sanExt.altNames.filter(a => a.type === 2).map(a => a.value))
      }
    }
  } catch {}

  return {
    commonName: getAttr(csr, 'CN'),
    organization: getAttr(csr, 'O'),
    organizationalUnit: getAttr(csr, 'OU'),
    country: getAttr(csr, 'C'),
    state: getAttr(csr, 'ST'),
    locality: getAttr(csr, 'L'),
    email: getAttr(csr, 'emailAddress'),
    publicKeyAlgorithm: 'RSA',
    publicKeyBits: bits,
    signatureAlgorithm: csr.md?.algorithm ?? 'sha256WithRSAEncryption',
    sans,
  }
}
```

- [ ] **Step 4: Run test — pastikan PASS**

```bash
cd apps/web && pnpm test -- --testPathPattern=csr-decoder
```

- [ ] **Step 5: Buat API route `src/app/api/csr-decoder/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { decodeCsr } from '@/lib/csr-decoder'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { pem } = await req.json()
  if (!pem) return NextResponse.json({ error: 'CSR PEM is required' }, { status: 400 })
  try {
    return NextResponse.json(decodeCsr(pem))
  } catch {
    return NextResponse.json({ error: 'Invalid CSR format. Paste a valid PEM-encoded CSR.' }, { status: 400 })
  }
}
```

- [ ] **Step 6: Buat `src/app/csr-decoder/page.tsx`**

```tsx
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
      'Public Key': `RSA ${data.publicKeyBits}-bit`,
      'Signature Algorithm': data.signatureAlgorithm,
      'SANs': data.sans,
    })
    setLoading(false)
  }

  return (
    <ToolPageLayout icon="📄" title="CSR Decoder" description="Paste atau upload CSR untuk melihat informasi di dalamnya.">
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
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/csr-decoder.ts apps/web/__tests__/lib/csr-decoder.test.ts apps/web/src/app/api/csr-decoder apps/web/src/app/csr-decoder
git commit -m "feat(web): add CSR Decoder lib, API route, and page"
```

---

## Task 8: Certificate Decoder — lib + API + page

**Files:**
- Create: `apps/web/src/lib/cert-decoder.ts`
- Create: `apps/web/__tests__/lib/cert-decoder.test.ts`
- Create: `apps/web/src/app/api/cert-decoder/route.ts`
- Create: `apps/web/src/app/cert-decoder/page.tsx`

- [ ] **Step 1: Tulis failing test**

```typescript
// apps/web/__tests__/lib/cert-decoder.test.ts
import { decodeCert } from '@/lib/cert-decoder'
import { fixtures } from '../fixtures'

describe('decodeCert', () => {
  it('decodes common name', () => {
    const result = decodeCert(fixtures.certPem)
    expect(result.subject.commonName).toBe('test.example.com')
  })
  it('decodes serial number', () => {
    const result = decodeCert(fixtures.certPem)
    expect(result.serialNumber).toBeTruthy()
  })
  it('computes SHA-256 fingerprint as hex string', () => {
    const result = decodeCert(fixtures.certPem)
    expect(result.fingerprintSha256).toMatch(/^[0-9A-F:]+$/)
  })
  it('throws on invalid input', () => {
    expect(() => decodeCert('bad input')).toThrow()
  })
})
```

- [ ] **Step 2: Run test — pastikan GAGAL**

```bash
cd apps/web && pnpm test -- --testPathPattern=cert-decoder
```

- [ ] **Step 3: Implementasi `src/lib/cert-decoder.ts`**

```typescript
import forge from 'node-forge'

export interface CertInfo {
  subject: { commonName: string; organization: string; organizationalUnit: string; country: string; state: string; locality: string }
  issuer: { commonName: string; organization: string; country: string }
  serialNumber: string
  validFrom: string
  validTo: string
  daysRemaining: number
  publicKey: { algorithm: string; bits: number }
  signatureAlgorithm: string
  sans: string[]
  keyUsage: string[]
  extKeyUsage: string[]
  fingerprintSha1: string
  fingerprintSha256: string
  pemRaw: string
}

function getField(dn: forge.pki.Certificate['subject'], name: string): string {
  const f = dn.getField(name)
  return f ? (f.value as string) : ''
}

function fingerprint(cert: forge.pki.Certificate, algorithm: 'sha1' | 'sha256'): string {
  const md = algorithm === 'sha1' ? forge.md.sha1.create() : forge.md.sha256.create()
  md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes())
  return md.digest().toHex().toUpperCase().match(/.{2}/g)!.join(':')
}

export function decodeCert(pemOrDer: string): CertInfo {
  let cert: forge.pki.Certificate
  const trimmed = pemOrDer.trim()
  if (trimmed.startsWith('-----BEGIN CERTIFICATE-----')) {
    cert = forge.pki.certificateFromPem(trimmed)
  } else {
    const der = forge.util.decode64(trimmed)
    cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(der))
  }

  const now = Date.now()
  const validTo = cert.validity.notAfter
  const daysRemaining = Math.floor((validTo.getTime() - now) / (1000 * 60 * 60 * 24))

  const sans: string[] = []
  try {
    const sanExt = cert.getExtension('subjectAltName') as { altNames?: { type: number; value: string }[] } | null
    if (sanExt?.altNames) sans.push(...sanExt.altNames.filter(a => a.type === 2).map(a => a.value))
  } catch {}

  const keyUsage: string[] = []
  try {
    const ku = cert.getExtension('keyUsage') as Record<string, boolean> | null
    if (ku) {
      if (ku.digitalSignature) keyUsage.push('Digital Signature')
      if (ku.keyEncipherment) keyUsage.push('Key Encipherment')
      if (ku.keyCertSign) keyUsage.push('Certificate Sign')
    }
  } catch {}

  const extKeyUsage: string[] = []
  try {
    const eku = cert.getExtension('extKeyUsage') as Record<string, boolean> | null
    if (eku) {
      if (eku.serverAuth) extKeyUsage.push('TLS Web Server Auth')
      if (eku.clientAuth) extKeyUsage.push('TLS Web Client Auth')
    }
  } catch {}

  const pubKey = cert.publicKey as forge.pki.rsa.PublicKey
  return {
    subject: { commonName: getField(cert.subject, 'CN'), organization: getField(cert.subject, 'O'), organizationalUnit: getField(cert.subject, 'OU'), country: getField(cert.subject, 'C'), state: getField(cert.subject, 'ST'), locality: getField(cert.subject, 'L') },
    issuer: { commonName: getField(cert.issuer, 'CN'), organization: getField(cert.issuer, 'O'), country: getField(cert.issuer, 'C') },
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore.toISOString().split('T')[0],
    validTo: validTo.toISOString().split('T')[0],
    daysRemaining,
    publicKey: { algorithm: 'RSA', bits: pubKey.n?.bitLength() ?? 0 },
    signatureAlgorithm: cert.siginfo.algorithmOid,
    sans,
    keyUsage,
    extKeyUsage,
    fingerprintSha1: fingerprint(cert, 'sha1'),
    fingerprintSha256: fingerprint(cert, 'sha256'),
    pemRaw: forge.pki.certificateToPem(cert),
  }
}
```

- [ ] **Step 4: Run test — pastikan PASS**

```bash
cd apps/web && pnpm test -- --testPathPattern=cert-decoder
```

- [ ] **Step 5: Buat API route `src/app/api/cert-decoder/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { decodeCert } from '@/lib/cert-decoder'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { pem } = await req.json()
  if (!pem) return NextResponse.json({ error: 'Certificate is required' }, { status: 400 })
  try {
    return NextResponse.json(decodeCert(pem))
  } catch {
    return NextResponse.json({ error: 'Invalid certificate format. Paste a PEM or base64 DER certificate.' }, { status: 400 })
  }
}
```

- [ ] **Step 6: Buat `src/app/cert-decoder/page.tsx`**

```tsx
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
        'SHA-1 Fingerprint': data.fingerprintSha1,
        'SHA-256 Fingerprint': data.fingerprintSha256,
      })
    }
    setLoading(false)
  }

  return (
    <ToolPageLayout icon="🔐" title="Certificate Decoder" description="Paste atau upload sertifikat X.509 (PEM/DER) untuk melihat semua informasinya.">
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
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/cert-decoder.ts apps/web/__tests__/lib/cert-decoder.test.ts apps/web/src/app/api/cert-decoder apps/web/src/app/cert-decoder
git commit -m "feat(web): add Certificate Decoder lib, API route, and page"
```

---

## Task 9: Key Matcher — lib + API + page

**Files:**
- Create: `apps/web/src/lib/key-matcher.ts`
- Create: `apps/web/__tests__/lib/key-matcher.test.ts`
- Create: `apps/web/src/app/api/key-matcher/route.ts`
- Create: `apps/web/src/app/key-matcher/page.tsx`

- [ ] **Step 1: Tulis failing test**

```typescript
// apps/web/__tests__/lib/key-matcher.test.ts
import { matchKeyToCert } from '@/lib/key-matcher'
import { fixtures } from '../fixtures'
import forge from 'node-forge'

describe('matchKeyToCert', () => {
  it('returns match=true for correct pair', () => {
    const result = matchKeyToCert(fixtures.certPem, fixtures.privateKeyPem)
    expect(result.match).toBe(true)
  })
  it('returns match=false for wrong key', () => {
    const wrongKey = forge.pki.privateKeyToPem(fixtures.otherKeys.privateKey)
    const result = matchKeyToCert(fixtures.certPem, wrongKey)
    expect(result.match).toBe(false)
  })
  it('throws on invalid cert', () => {
    expect(() => matchKeyToCert('bad cert', fixtures.privateKeyPem)).toThrow()
  })
})
```

- [ ] **Step 2: Run test — pastikan GAGAL**

```bash
cd apps/web && pnpm test -- --testPathPattern=key-matcher
```

- [ ] **Step 3: Implementasi `src/lib/key-matcher.ts`**

```typescript
import forge from 'node-forge'

export interface KeyMatchResult {
  match: boolean
  certCommonName: string
  keyType: string
  explanation: string
}

export function matchKeyToCert(certPem: string, keyPem: string): KeyMatchResult {
  const cert = forge.pki.certificateFromPem(certPem)
  const privateKey = forge.pki.privateKeyFromPem(keyPem) as forge.pki.rsa.PrivateKey
  const certPublicKey = cert.publicKey as forge.pki.rsa.PublicKey

  const certModulus = certPublicKey.n.toString(16)
  const keyModulus = privateKey.n.toString(16)
  const match = certModulus === keyModulus

  const cn = (cert.subject.getField('CN')?.value as string) ?? 'Unknown'

  return {
    match,
    certCommonName: cn,
    keyType: `RSA ${certPublicKey.n.bitLength()}-bit`,
    explanation: match
      ? `The private key matches the public key in certificate "${cn}".`
      : `The private key does NOT match certificate "${cn}". They have different public keys.`,
  }
}
```

- [ ] **Step 4: Run test — pastikan PASS**

```bash
cd apps/web && pnpm test -- --testPathPattern=key-matcher
```

- [ ] **Step 5: Buat API route `src/app/api/key-matcher/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { matchKeyToCert } from '@/lib/key-matcher'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { cert, key } = await req.json()
  if (!cert || !key) return NextResponse.json({ error: 'Certificate and private key are both required' }, { status: 400 })
  try {
    return NextResponse.json(matchKeyToCert(cert, key))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Parse error'
    return NextResponse.json({ error: `Invalid input: ${message}` }, { status: 400 })
  }
}
```

- [ ] **Step 6: Buat `src/app/key-matcher/page.tsx`**

```tsx
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
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/key-matcher.ts apps/web/__tests__/lib/key-matcher.test.ts apps/web/src/app/api/key-matcher apps/web/src/app/key-matcher
git commit -m "feat(web): add Key Matcher lib, API route, and page"
```

---

## Task 10: SSL Converter — lib + API + page

**Files:**
- Create: `apps/web/src/lib/ssl-converter.ts`
- Create: `apps/web/__tests__/lib/ssl-converter.test.ts`
- Create: `apps/web/src/app/api/ssl-converter/route.ts`
- Create: `apps/web/src/app/ssl-converter/page.tsx`

- [ ] **Step 1: Tulis failing test**

```typescript
// apps/web/__tests__/lib/ssl-converter.test.ts
import { convertCert, detectFormat } from '@/lib/ssl-converter'
import { fixtures } from '../fixtures'

describe('detectFormat', () => {
  it('detects PEM format', () => {
    expect(detectFormat(fixtures.certPem)).toBe('pem')
  })
})

describe('convertCert', () => {
  it('converts PEM to DER (returns Buffer)', () => {
    const result = convertCert(fixtures.certPem, 'der')
    expect(result.data).toBeInstanceOf(Buffer)
    expect(result.filename).toMatch(/\.der$/)
  })
  it('converts PEM to PEM (round-trip)', () => {
    const result = convertCert(fixtures.certPem, 'pem')
    expect(result.data.toString()).toContain('BEGIN CERTIFICATE')
  })
})
```

- [ ] **Step 2: Run test — pastikan GAGAL**

```bash
cd apps/web && pnpm test -- --testPathPattern=ssl-converter
```

- [ ] **Step 3: Implementasi `src/lib/ssl-converter.ts`**

```typescript
import forge from 'node-forge'

export type CertFormat = 'pem' | 'der' | 'pfx'

export interface ConvertResult {
  data: Buffer
  filename: string
  mimeType: string
}

export function detectFormat(input: string): CertFormat {
  const trimmed = input.trim()
  if (trimmed.startsWith('-----BEGIN')) return 'pem'
  return 'der'
}

export function convertCert(
  certInput: string,
  targetFormat: CertFormat,
  privateKeyPem?: string,
  passphrase?: string,
): ConvertResult {
  const sourceFormat = detectFormat(certInput)
  let cert: forge.pki.Certificate

  if (sourceFormat === 'pem') {
    cert = forge.pki.certificateFromPem(certInput)
  } else {
    const der = Buffer.from(certInput, 'base64')
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(der))
    cert = forge.pki.certificateFromAsn1(asn1)
  }

  if (targetFormat === 'pem') {
    const pem = forge.pki.certificateToPem(cert)
    return { data: Buffer.from(pem, 'utf8'), filename: 'certificate.pem', mimeType: 'application/x-pem-file' }
  }

  if (targetFormat === 'der') {
    const asn1 = forge.pki.certificateToAsn1(cert)
    const der = forge.asn1.toDer(asn1).getBytes()
    return { data: Buffer.from(der, 'binary'), filename: 'certificate.der', mimeType: 'application/x-x509-ca-cert' }
  }

  if (targetFormat === 'pfx') {
    if (!privateKeyPem) throw new Error('Private key is required for PFX conversion')
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], passphrase ?? '', { algorithm: '3des' })
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes()
    return { data: Buffer.from(p12Der, 'binary'), filename: 'certificate.pfx', mimeType: 'application/x-pkcs12' }
  }

  throw new Error(`Unsupported format: ${targetFormat}`)
}
```

- [ ] **Step 4: Run test — pastikan PASS**

```bash
cd apps/web && pnpm test -- --testPathPattern=ssl-converter
```

- [ ] **Step 5: Buat API route `src/app/api/ssl-converter/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { convertCert, CertFormat } from '@/lib/ssl-converter'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const certFile = formData.get('cert') as File | null
  const keyFile = formData.get('key') as File | null
  const targetFormat = formData.get('format') as CertFormat
  const passphrase = formData.get('passphrase') as string | null

  if (!certFile) return NextResponse.json({ error: 'Certificate file is required' }, { status: 400 })
  if (!['pem', 'der', 'pfx'].includes(targetFormat))
    return NextResponse.json({ error: 'Invalid target format. Choose pem, der, or pfx.' }, { status: 400 })

  const certText = await certFile.text()
  const keyText = keyFile ? await keyFile.text() : undefined

  try {
    const result = convertCert(certText, targetFormat, keyText, passphrase ?? undefined)
    return new NextResponse(result.data, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Conversion failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 6: Buat `src/app/ssl-converter/page.tsx`**

```tsx
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
```

- [ ] **Step 7: Jalankan semua tests**

```bash
cd apps/web && pnpm test
```

Expected: semua test PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/ssl-converter.ts apps/web/__tests__/lib/ssl-converter.test.ts apps/web/src/app/api/ssl-converter apps/web/src/app/ssl-converter
git commit -m "feat(web): add SSL Converter lib, API route, and page"
```

---

## Task 11: Dockerfile (Web)

**Files:**
- Create: `apps/web/Dockerfile`
- Create: `apps/web/.dockerignore`

- [ ] **Step 1: Buat `apps/web/Dockerfile`**

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 2: Update `apps/web/next.config.ts` untuk standalone output**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Step 3: Buat `apps/web/.dockerignore`**

```
node_modules
.next
.turbo
__tests__
*.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/Dockerfile apps/web/.dockerignore apps/web/next.config.ts
git commit -m "feat(web): add Dockerfile for self-hosted deployment"
```

---

## Task 12: CLI — Setup & Structure

**Files:**
- Create: `apps/cli/Cargo.toml`
- Create: `apps/cli/src/main.rs`
- Create: `apps/cli/src/commands/mod.rs`
- Create: `apps/cli/src/output.rs`

- [ ] **Step 1: Inisialisasi Rust project**

```bash
cd apps
cargo new cli --name ssl-tools
cd ..
```

- [ ] **Step 2: Tulis `apps/cli/Cargo.toml`**

```toml
[package]
name = "ssl-tools"
version = "0.1.0"
edition = "2021"
description = "SSL certificate utilities CLI"
license = "MIT"

[[bin]]
name = "ssl-tools"
path = "src/main.rs"

[dependencies]
clap = { version = "4", features = ["derive"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
x509-parser = "0.16"
pem = "3"
native-tls = "0.2"
colored = "2"
anyhow = "1"
tokio = { version = "1", features = ["full"] }
openssl = { version = "0.10", features = ["v102", "v110"] }

[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 3: Tulis `apps/cli/src/output.rs`**

```rust
use colored::Colorize;
use serde::Serialize;

pub fn print_field(label: &str, value: &str) {
    println!("{}: {}", label.dimmed(), value.white());
}

pub fn print_list(label: &str, values: &[String]) {
    if values.is_empty() { return; }
    println!("{}: {}", label.dimmed(), values.join(", ").white());
}

pub fn print_status_ok(msg: &str) {
    println!("{} {}", "✓".green().bold(), msg.green().bold());
}

pub fn print_status_err(msg: &str) {
    println!("{} {}", "✗".red().bold(), msg.red().bold());
}

pub fn print_json<T: Serialize>(value: &T) {
    println!("{}", serde_json::to_string_pretty(value).unwrap());
}
```

- [ ] **Step 4: Tulis `apps/cli/src/commands/mod.rs`**

```rust
pub mod check;
pub mod decode_csr;
pub mod decode_cert;
pub mod match_key;
pub mod convert;
```

- [ ] **Step 5: Tulis `apps/cli/src/main.rs`**

```rust
use clap::{Parser, Subcommand};
use anyhow::Result;

mod commands;
mod output;

#[derive(Parser)]
#[command(name = "ssl-tools", about = "SSL certificate utilities", version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Check {
        domain: String,
        #[arg(long, default_value_t = 443)]
        port: u16,
        #[arg(long)]
        json: bool,
    },
    DecodeCsr {
        file: String,
        #[arg(long)]
        json: bool,
    },
    DecodeCert {
        file: String,
        #[arg(long)]
        json: bool,
    },
    Match {
        cert_file: String,
        key_file: String,
        #[arg(long)]
        json: bool,
    },
    Convert {
        file: String,
        #[arg(long)]
        to: String,
        #[arg(long)]
        key: Option<String>,
        #[arg(long)]
        passphrase: Option<String>,
        #[arg(short, long)]
        output: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Check { domain, port, json } => commands::check::run(&domain, port, json).await,
        Commands::DecodeCsr { file, json } => commands::decode_csr::run(&file, json),
        Commands::DecodeCert { file, json } => commands::decode_cert::run(&file, json),
        Commands::Match { cert_file, key_file, json } => commands::match_key::run(&cert_file, &key_file, json),
        Commands::Convert { file, to, key, passphrase, output } => commands::convert::run(&file, &to, key.as_deref(), passphrase.as_deref(), output.as_deref()),
    }
}
```

- [ ] **Step 6: Verifikasi compile**

```bash
cd apps/cli && cargo build 2>&1 | head -20
```

Expected: compile sukses (mungkin ada warning unused module, itu normal).

- [ ] **Step 7: Commit**

```bash
git add apps/cli
git commit -m "feat(cli): initialize Rust CLI project with clap structure"
```

---

## Task 13: CLI — check command

**Files:**
- Create: `apps/cli/src/commands/check.rs`

- [ ] **Step 1: Tulis `apps/cli/src/commands/check.rs`**

```rust
use anyhow::{Context, Result};
use native_tls::TlsConnector;
use serde::Serialize;
use std::net::TcpStream;
use x509_parser::prelude::*;
use crate::output;

#[derive(Serialize)]
pub struct SslCheckResult {
    pub status: String,
    pub days_remaining: i64,
    pub issued_to: String,
    pub issuer: String,
    pub valid_from: String,
    pub valid_to: String,
    pub protocol: String,
    pub sans: Vec<String>,
}

pub async fn run(domain: &str, port: u16, json: bool) -> Result<()> {
    let domain = domain
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .split('/')
        .next()
        .unwrap_or(domain);

    let addr = format!("{}:{}", domain, port);
    let stream = TcpStream::connect(&addr)
        .with_context(|| format!("Cannot connect to {}", addr))?;

    let connector = TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .build()?;

    let tls = connector
        .connect(domain, stream)
        .with_context(|| "TLS handshake failed")?;

    let cert = tls.peer_certificate()?.context("No certificate returned")?;

    // native-tls Certificate only exposes DER bytes — parse with x509-parser
    let der = cert.to_der()?;
    let (_, parsed) = X509Certificate::from_der(&der)
        .with_context(|| "Failed to parse certificate from server")?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_secs() as i64;

    let not_after = parsed.validity().not_after.timestamp();
    let not_before = parsed.validity().not_before.timestamp();
    let days_remaining = (not_after - now) / 86400;

    let get_attr = |dn: &X509Name, oid: &Oid| -> String {
        dn.iter_by_oid(oid)
            .next()
            .and_then(|a| a.as_str().ok())
            .unwrap_or("")
            .to_string()
    };

    let sans: Vec<String> = parsed.subject_alternative_name()
        .ok().flatten()
        .map(|ext| ext.value.general_names.iter()
            .filter_map(|n| if let GeneralName::DNSName(s) = n { Some(s.to_string()) } else { None })
            .collect())
        .unwrap_or_default();

    let result = SslCheckResult {
        status: if days_remaining >= 0 { "valid".into() } else { "expired".into() },
        days_remaining,
        issued_to: get_attr(parsed.subject(), &OID_X509_COMMON_NAME),
        issuer: get_attr(parsed.issuer(), &OID_X509_ORGANIZATION),
        valid_from: parsed.validity().not_before.to_rfc2822().unwrap_or_default(),
        valid_to: parsed.validity().not_after.to_rfc2822().unwrap_or_default(),
        protocol: "TLS".to_string(),
        sans,
    };

    if json {
        output::print_json(&result);
    } else {
        if result.days_remaining >= 0 {
            output::print_status_ok(&format!("Valid — {} days remaining", result.days_remaining));
        } else {
            output::print_status_err(&format!("Expired {} days ago", result.days_remaining.abs()));
        }
        output::print_field("Issued To", &result.issued_to);
        output::print_field("Issuer", &result.issuer);
        output::print_field("Valid From", &result.valid_from);
        output::print_field("Valid To", &result.valid_to);
        output::print_field("Protocol", &result.protocol);
        output::print_list("SANs", &result.sans);
    }

    Ok(())
}
```

- [ ] **Step 2: Build dan test manual**

```bash
cd apps/cli && cargo build && ./target/debug/ssl-tools check google.com
```

Expected: output status SSL google.com.

- [ ] **Step 3: Commit**

```bash
git add apps/cli/src/commands/check.rs
git commit -m "feat(cli): add check command for SSL Checker"
```

---

## Task 14: CLI — decode-csr, decode-cert, match commands

**Files:**
- Create: `apps/cli/src/commands/decode_csr.rs`
- Create: `apps/cli/src/commands/decode_cert.rs`
- Create: `apps/cli/src/commands/match_key.rs`

- [ ] **Step 1: Tulis `decode_csr.rs`**

```rust
use anyhow::{Context, Result};
use pem::parse;
use serde::Serialize;
use x509_parser::prelude::*;
use crate::output;

#[derive(Serialize)]
pub struct CsrInfo {
    pub common_name: String,
    pub organization: String,
    pub country: String,
    pub state: String,
    pub locality: String,
    pub public_key_algorithm: String,
    pub signature_algorithm: String,
    pub sans: Vec<String>,
}

pub fn run(file: &str, json: bool) -> Result<()> {
    let content = std::fs::read_to_string(file)
        .with_context(|| format!("Cannot read file: {}", file))?;
    let pem = parse(content.trim())
        .with_context(|| "Invalid PEM format")?;
    let (_, csr) = X509CertificationRequest::from_der(pem.contents())
        .with_context(|| "Failed to parse CSR")?;

    let get_attr = |oid: &Oid| -> String {
        csr.certification_request_info.subject
            .iter_by_oid(oid)
            .next()
            .and_then(|a| a.as_str().ok())
            .unwrap_or("")
            .to_string()
    };

    let info = CsrInfo {
        common_name: get_attr(&OID_X509_COMMON_NAME),
        organization: get_attr(&OID_X509_ORGANIZATION),
        country: get_attr(&OID_X509_COUNTRY),
        state: get_attr(&OID_X509_STATE_OR_PROVINCE),
        locality: get_attr(&OID_X509_LOCALITY),
        public_key_algorithm: "RSA".to_string(),
        signature_algorithm: csr.signature_algorithm.algorithm.to_id_string(),
        sans: vec![],
    };

    if json {
        output::print_json(&info);
    } else {
        output::print_field("Common Name", &info.common_name);
        output::print_field("Organization", &info.organization);
        output::print_field("Country", &info.country);
        output::print_field("State", &info.state);
        output::print_field("Locality", &info.locality);
        output::print_field("Public Key", &info.public_key_algorithm);
        output::print_field("Signature Algorithm", &info.signature_algorithm);
    }
    Ok(())
}
```

- [ ] **Step 2: Tulis `decode_cert.rs`**

```rust
use anyhow::{Context, Result};
use pem::parse;
use serde::Serialize;
use x509_parser::prelude::*;
use crate::output;

#[derive(Serialize)]
pub struct CertInfo {
    pub common_name: String,
    pub organization: String,
    pub issuer: String,
    pub serial_number: String,
    pub valid_from: String,
    pub valid_to: String,
    pub days_remaining: i64,
    pub public_key_algorithm: String,
    pub signature_algorithm: String,
    pub sans: Vec<String>,
}

pub fn run(file: &str, json: bool) -> Result<()> {
    let content = std::fs::read(file)
        .with_context(|| format!("Cannot read file: {}", file))?;

    let der = if content.starts_with(b"-----") {
        let pem = parse(std::str::from_utf8(&content)?.trim())?;
        pem.contents().to_vec()
    } else {
        content
    };

    let (_, cert) = X509Certificate::from_der(&der)
        .with_context(|| "Failed to parse certificate")?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_secs() as i64;

    let not_after = cert.validity().not_after.timestamp();
    let days_remaining = (not_after - now) / 86400;

    let get_attr = |dn: &X509Name, oid: &Oid| -> String {
        dn.iter_by_oid(oid)
            .next()
            .and_then(|a| a.as_str().ok())
            .unwrap_or("")
            .to_string()
    };

    let sans: Vec<String> = cert.subject_alternative_name()
        .ok().flatten()
        .map(|ext| ext.value.general_names.iter()
            .filter_map(|n| if let GeneralName::DNSName(s) = n { Some(s.to_string()) } else { None })
            .collect())
        .unwrap_or_default();

    let info = CertInfo {
        common_name: get_attr(cert.subject(), &OID_X509_COMMON_NAME),
        organization: get_attr(cert.subject(), &OID_X509_ORGANIZATION),
        issuer: get_attr(cert.issuer(), &OID_X509_ORGANIZATION),
        serial_number: cert.raw_serial_as_string(),
        valid_from: cert.validity().not_before.to_rfc2822().unwrap_or_default(),
        valid_to: cert.validity().not_after.to_rfc2822().unwrap_or_default(),
        days_remaining,
        public_key_algorithm: cert.public_key().algorithm.algorithm.to_id_string(),
        signature_algorithm: cert.signature_algorithm.algorithm.to_id_string(),
        sans,
    };

    if json {
        output::print_json(&info);
    } else {
        if days_remaining >= 0 {
            output::print_status_ok(&format!("Valid — {} days remaining", days_remaining));
        } else {
            output::print_status_err(&format!("Expired {} days ago", days_remaining.abs()));
        }
        output::print_field("Common Name", &info.common_name);
        output::print_field("Organization", &info.organization);
        output::print_field("Issuer", &info.issuer);
        output::print_field("Serial", &info.serial_number);
        output::print_field("Valid From", &info.valid_from);
        output::print_field("Valid To", &info.valid_to);
        output::print_field("Public Key", &info.public_key_algorithm);
        output::print_list("SANs", &info.sans);
    }
    Ok(())
}
```

- [ ] **Step 3: Tulis `match_key.rs`**

```rust
use anyhow::{Context, Result};
use openssl::pkey::PKey;
use openssl::x509::X509;
use serde::Serialize;
use crate::output;

#[derive(Serialize)]
pub struct MatchResult {
    pub match_result: bool,
    pub cert_common_name: String,
    pub key_type: String,
    pub explanation: String,
}

pub fn run(cert_file: &str, key_file: &str, json: bool) -> Result<()> {
    let cert_pem = std::fs::read(cert_file)
        .with_context(|| format!("Cannot read cert: {}", cert_file))?;
    let key_pem = std::fs::read(key_file)
        .with_context(|| format!("Cannot read key: {}", key_file))?;

    let cert = X509::from_pem(&cert_pem).or_else(|_| X509::from_der(&cert_pem))
        .with_context(|| "Invalid certificate format")?;
    let key = PKey::private_key_from_pem(&key_pem)
        .with_context(|| "Invalid private key format")?;

    let cert_pub = cert.public_key()?;
    let is_match = cert_pub.public_eq(&key);

    let cn = cert.subject_name()
        .entries_by_nid(openssl::nid::Nid::COMMONNAME)
        .next()
        .and_then(|e| e.data().as_utf8().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let result = MatchResult {
        match_result: is_match,
        cert_common_name: cn.clone(),
        key_type: format!("{}-bit", key.bits()),
        explanation: if is_match {
            format!("The private key matches certificate \"{}\".", cn)
        } else {
            format!("The private key does NOT match certificate \"{}\".", cn)
        },
    };

    if json {
        output::print_json(&result);
    } else {
        if result.match_result {
            output::print_status_ok("Match — the private key matches the certificate");
        } else {
            output::print_status_err("No Match — the private key does not match the certificate");
        }
        output::print_field("Common Name", &result.cert_common_name);
        output::print_field("Key Type", &result.key_type);
    }
    Ok(())
}
```

- [ ] **Step 4: Build untuk verifikasi compile**

```bash
cd apps/cli && cargo build 2>&1
```

- [ ] **Step 5: Commit**

```bash
git add apps/cli/src/commands/decode_csr.rs apps/cli/src/commands/decode_cert.rs apps/cli/src/commands/match_key.rs
git commit -m "feat(cli): add decode-csr, decode-cert, and match commands"
```

---

## Task 15: CLI — convert command

**Files:**
- Create: `apps/cli/src/commands/convert.rs`

- [ ] **Step 1: Tulis `convert.rs`**

```rust
use anyhow::{bail, Context, Result};
use openssl::pkcs12::Pkcs12;
use openssl::pkey::PKey;
use openssl::x509::X509;
use std::path::Path;

pub fn run(
    file: &str,
    to: &str,
    key_file: Option<&str>,
    passphrase: Option<&str>,
    output_path: Option<&str>,
) -> Result<()> {
    let input = std::fs::read(file)
        .with_context(|| format!("Cannot read file: {}", file))?;

    let output_data: Vec<u8> = match to.to_lowercase().as_str() {
        "pem" => {
            let cert = if input.starts_with(b"-----") {
                X509::from_pem(&input)?
            } else if file.ends_with(".p12") || file.ends_with(".pfx") {
                let pass = passphrase.unwrap_or("");
                let p12 = Pkcs12::from_der(&input)?;
                let parsed = p12.parse2(pass)?;
                parsed.cert.context("No certificate in PFX")?
            } else {
                X509::from_der(&input)?
            };
            cert.to_pem()?
        }
        "der" => {
            let cert = if input.starts_with(b"-----") {
                X509::from_pem(&input)?
            } else {
                X509::from_der(&input)?
            };
            cert.to_der()?
        }
        "pfx" | "p12" => {
            let cert = if input.starts_with(b"-----") {
                X509::from_pem(&input)?
            } else {
                X509::from_der(&input)?
            };
            let key_path = key_file.context("--key <private-key-file> is required for PFX conversion")?;
            let key_pem = std::fs::read(key_path)?;
            let key = PKey::private_key_from_pem(&key_pem)?;
            let pass = passphrase.unwrap_or("");
            let p12 = Pkcs12::builder()
                .name("certificate")
                .pkey(&key)
                .cert(&cert)
                .build2(pass)?;
            p12.to_der()?
        }
        _ => bail!("Unsupported format: {}. Choose pem, der, or pfx.", to),
    };

    let ext = match to.to_lowercase().as_str() {
        "pem" => "pem",
        "der" => "der",
        "pfx" | "p12" => "pfx",
        _ => to,
    };

    let out_path = output_path.map(|s| s.to_string()).unwrap_or_else(|| {
        let stem = Path::new(file).file_stem().and_then(|s| s.to_str()).unwrap_or("certificate");
        format!("{}.{}", stem, ext)
    });

    std::fs::write(&out_path, &output_data)
        .with_context(|| format!("Cannot write output to {}", out_path))?;

    println!("Converted and saved to: {}", out_path);
    Ok(())
}
```

- [ ] **Step 2: Build final**

```bash
cd apps/cli && cargo build --release
```

Expected: binary di `target/release/ssl-tools`.

- [ ] **Step 3: Smoke test CLI**

```bash
./apps/cli/target/release/ssl-tools --help
./apps/cli/target/release/ssl-tools check google.com
```

- [ ] **Step 4: Commit**

```bash
git add apps/cli/src/commands/convert.rs
git commit -m "feat(cli): add convert command for SSL format conversion"
```

---

## Task 16: GitHub Actions

**Files:**
- Create: `.github/workflows/web-deploy.yml`
- Create: `.github/workflows/cli-release.yml`

- [ ] **Step 1: Buat `.github/workflows/web-deploy.yml`**

```yaml
name: Web CI

on:
  push:
    branches: [main]
    paths: ['apps/web/**']
  pull_request:
    paths: ['apps/web/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web test
      - run: pnpm --filter web build
```

- [ ] **Step 2: Buat `.github/workflows/cli-release.yml`**

```yaml
name: CLI Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            artifact: ssl-tools-linux-x86_64
          - os: macos-latest
            target: x86_64-apple-darwin
            artifact: ssl-tools-macos-x86_64
          - os: macos-latest
            target: aarch64-apple-darwin
            artifact: ssl-tools-macos-arm64
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            artifact: ssl-tools-windows-x86_64.exe

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with: { targets: ${{ matrix.target }} }
      - run: cargo build --release --target ${{ matrix.target }}
        working-directory: apps/cli
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.artifact }}
          path: apps/cli/target/${{ matrix.target }}/release/ssl-tools*

  release:
    needs: build
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/download-artifact@v4
      - uses: softprops/action-gh-release@v2
        with:
          files: '**/*ssl-tools*'
```

- [ ] **Step 3: Commit**

```bash
git add .github
git commit -m "ci: add GitHub Actions for web CI and CLI releases"
```

---

## Checklist Akhir

- [ ] Semua web tests pass: `cd apps/web && pnpm test`
- [ ] Web dev server berjalan: `cd apps/web && pnpm dev` → buka http://localhost:3000
- [ ] Semua 5 tool pages bisa diakses dan berfungsi
- [ ] CLI compile: `cd apps/cli && cargo build --release`
- [ ] CLI commands berfungsi: `ssl-tools check`, `decode-csr`, `decode-cert`, `match`, `convert`
- [ ] Docker build: `docker build -f apps/web/Dockerfile .`
