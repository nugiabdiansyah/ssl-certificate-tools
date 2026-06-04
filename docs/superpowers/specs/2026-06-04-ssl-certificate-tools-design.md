# SSL Certificate Tools — Design Spec

**Date:** 2026-06-04
**Status:** Approved

---

## Overview

SSL Certificate Tools adalah aplikasi open-source yang menyediakan sekumpulan utilities untuk bekerja dengan sertifikat SSL/TLS. Tersedia dalam dua platform: web app berbasis browser dan CLI binary. Semua operasi berjalan di sisi server/lokal — tidak ada data pengguna yang disimpan.

---

## Platform & Tech Stack

### Web App (`apps/web`)
- **Framework:** Next.js 14 (App Router)
- **UI:** React + Tailwind CSS
- **Crypto library:** `node-forge` (server-side only, di API Routes)
- **Theme:** Dark purple/indigo (`#0a0a0f` background, `#6366f1`/`#818cf8` aksen)
- **Deploy:** Vercel (publik) + Docker (self-hosted)

### CLI (`apps/cli`)
- **Language:** Rust
- **Argument parsing:** `clap`
- **Crypto:** `x509-parser`, `openssl` crate, `pem`
- **Output:** plain text (default) + `--json` flag untuk machine-readable

### Monorepo Structure
```
ssl-certificate-tools/
├── apps/
│   ├── web/                  # Next.js 14 App Router
│   └── cli/                  # Rust binary
├── packages/
│   └── types/                # Shared TypeScript types (optional)
├── docs/
│   └── superpowers/specs/
├── turbo.json
├── pnpm-workspace.yaml
├── .gitignore
└── README.md
```

---

## Tools

### 1. SSL Checker
Mengecek status dan detail sertifikat SSL dari domain yang aktif (live connection).

**Input:** Domain name (contoh: `example.com`, bisa dengan atau tanpa `https://`)
**Output:**
- Status: Valid / Expired / Invalid
- Sisa hari hingga expiry
- Issued To (CN)
- Issuer
- Valid From / Valid To
- Algorithm (RSA 2048-bit, ECDSA 256-bit, dll)
- Protocol (TLS 1.2 / 1.3)
- SANs (Subject Alternative Names)

**Web:** Input field domain → tombol "Check SSL" → hasil ditampilkan di card
**CLI:** `ssl-tools check <domain> [--json] [--port <port>]`

**Implementation note (web):** Gunakan Node.js `tls.connect()` di API Route untuk fetch sertifikat dari server live.

---

### 2. CSR Decoder
Mem-parse dan menampilkan informasi dari Certificate Signing Request (format PEM).

**Input:** Teks PEM (`-----BEGIN CERTIFICATE REQUEST-----`) — paste atau upload file `.csr`
**Output:**
- Common Name (CN)
- Organization (O), Organizational Unit (OU)
- Country (C), State (ST), Locality (L)
- Email
- Public Key info (algoritma, key size)
- SANs (jika ada)
- Signature Algorithm

**Web:** Textarea paste + tombol upload file → parse → tampilkan tabel field
**CLI:** `ssl-tools decode-csr <file.csr> [--json]`

---

### 3. Certificate Decoder
Mem-parse sertifikat X.509 (PEM atau DER) dan menampilkan semua field.

**Input:** Teks PEM (`-----BEGIN CERTIFICATE-----`) atau file `.crt`/`.pem`/`.der` — paste atau upload
**Output:**
- Subject (CN, O, OU, C, ST, L)
- Issuer
- Serial Number
- Valid From / Valid To
- Public Key (algoritma, key size, fingerprint)
- Signature Algorithm
- Extensions (Key Usage, Extended Key Usage, Basic Constraints, CRL, OCSP)
- SANs
- Fingerprints (SHA-1, SHA-256)
- PEM raw (collapsible)

**Web:** Textarea + upload → parse → tampilkan tabel lengkap
**CLI:** `ssl-tools decode-cert <file> [--json]`

---

### 4. Certificate Key Matcher
Memverifikasi apakah sebuah private key cocok dengan sertifikat.

**Input:** Dua input — (1) sertifikat PEM/file, (2) private key PEM/file
**Output:**
- Match / No Match (dengan penjelasan)
- Info singkat dari masing-masing (CN dari cert, key type dari key)

**Implementation:** Bandingkan public key yang di-extract dari certificate dengan public key yang di-derive dari private key. Tidak perlu signing/verification penuh.

**Web:** Dua textarea/upload → tombol "Check Match" → hasil dengan indikator warna
**CLI:** `ssl-tools match <cert-file> <key-file> [--json]`

---

### 5. SSL Converter
Mengkonversi sertifikat antar format.

**Format yang didukung:** PEM, DER, PFX/P12, CRT (alias PEM)
**Konversi yang didukung:**
- PEM → DER
- PEM → PFX/P12 (butuh private key + optional passphrase)
- DER → PEM
- PFX/P12 → PEM (butuh passphrase jika terenkripsi)

**Web:** Upload file + pilih format output + (opsional) private key & passphrase → download hasil
**CLI:** `ssl-tools convert <input-file> --to <format> [--key <key-file>] [--passphrase <pass>] [-o <output-file>]`

---

## Web App — UI/UX

### Layout
- **Homepage:** Navbar + hero section + grid 5 tools (2 kolom, converter full-width)
- **Tool pages:** Breadcrumb + judul + deskripsi singkat + form input + hasil + CLI hint di bawah

### Navbar
- Logo + nama kiri
- Links: Tools, CLI, Docs, GitHub (kanan)

### Homepage Hero
- Tagline: "Free SSL Utilities for Developers"
- Sub: "No data stored. Open source."
- CTA: "Browse Tools" + "Install CLI"

### Tool Page Pattern
Setiap tool mengikuti pola yang sama:
1. Breadcrumb (`SSL Tools / Nama Tool`)
2. Icon + Judul + deskripsi
3. Input area (textarea paste + tombol upload file)
4. Tombol aksi utama
5. Output card (muncul setelah submit)
6. CLI equivalent hint (collapsible code block di bawah)

### Privacy Note
Footer atau banner kecil: "All processing is done server-side and no data is stored or logged."

---

## CLI — Interface Design

### Installation
```bash
# Via cargo
cargo install ssl-tools

# Via script (planned)
curl -fsSL https://ssl-tools.dev/install.sh | sh
```

### Commands
```bash
ssl-tools check <domain> [--port 443] [--json]
ssl-tools decode-csr <file> [--json]
ssl-tools decode-cert <file> [--json]
ssl-tools match <cert-file> <key-file> [--json]
ssl-tools convert <file> --to <pem|der|pfx> [--key <file>] [--passphrase <pass>] [-o <output>]
ssl-tools --version
ssl-tools --help
```

### Output Format
- Default: tabel/teks yang human-readable dengan warna (via `colored` crate)
- `--json`: JSON terstruktur untuk scripting/piping

---

## Data Flow

```
Web: User input (browser)
  → Next.js API Route (server-side)
  → node-forge / tls.connect() processing
  → JSON response
  → React renders result

CLI: User input (terminal args)
  → Rust parsing (clap)
  → openssl/x509-parser processing
  → stdout (text atau JSON)
```

**Penting:** Semua crypto processing di web app terjadi di **server-side** (API Routes), bukan di browser. Private key/certificate tidak pernah dikirim ke third-party.

---

## Error Handling

- **SSL Checker:** Domain tidak ditemukan, timeout, port tertutup, self-signed cert → pesan error spesifik
- **Decoder:** Format tidak valid, bukan PEM/DER yang valid → highlight baris yang bermasalah
- **Key Matcher:** Format tidak valid, key terenkripsi tanpa passphrase → pesan informatif
- **Converter:** Format tidak didukung, file corrupt, passphrase salah → pesan error + saran

---

## Deployment

### Vercel (publik)
- Auto-deploy dari `main` branch
- Environment: Node.js runtime untuk API Routes

### Docker (self-hosted)
```dockerfile
# Planned — multi-stage build
FROM node:20-alpine AS builder
# ... build Next.js
FROM node:20-alpine AS runner
# ... serve
```

### CLI Distribution
- GitHub Releases: binary untuk Linux (x86_64, aarch64), macOS (x86_64, arm64), Windows
- crates.io: `cargo install ssl-tools`

---

## Non-Goals (v1)

- Tidak ada user accounts atau autentikasi
- Tidak ada history/riwayat pengecekan
- Tidak ada bulk/batch checking
- Tidak ada CA (Certificate Authority) simulation
- Tidak ada monitoring/alerting SSL expiry
