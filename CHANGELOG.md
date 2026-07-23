# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [v1.0.6] — 2026-07-23

### Added
- **crates.io packaging** — added crate metadata, a CLI-specific README, and MIT license text for the first manual publication.

### Changed
- **CLI version** bumped to `1.0.6`.
- **CLI `create-csr`** accepts `--country-code` as an alias for `--country`.

---

## [v1.0.5] — 2026-07-03

### Added
- **CLI `create-csr`** — create a CSR with a generated ECDSA/RSA private key or an existing private key.
- **CLI release workflow** — manual `workflow_dispatch` release support while retaining tag-based releases.

### Changed
- **CLI version** bumped to `1.0.5`.
- **CLI `decode-csr` and `decode-cert`** now include `Domain Type` (`Wildcard`, `Single Domain`, `Multi Domain`, `Unknown`).
- **CSR and key handling** supports ECDSA inputs.

---

## [v1.0.2] — 2026-06-08

### Added
- **Fingerprint tool** (web + CLI) — dedicated page `/fingerprint` for extracting certificate fingerprints
  - Live check: connect to any host:port and compute fingerprints directly from the TLS handshake
  - File upload: parse a PEM or DER certificate file
  - Outputs SHA-1, SHA-256, and Proxmox/PBS format (`sha256:XX:XX:...`)
  - PBS/PVE config snippets: `storage.cfg`, `proxmox-backup-client --fingerprint` argument
- **SSL Checker** — SHA-1 and SHA-256 fingerprints now shown in every certificate ChainCard
- **CLI `fingerprint`** — new subcommand
  ```
  ssl-tools fingerprint minio.internal:9000
  ssl-tools fingerprint minio.internal:9000 --pbs
  ssl-tools fingerprint minio.internal:9000 --json
  ```
- **CLI `decode-cert`** — SHA-1 and SHA-256 fingerprints added to output; Public Key algorithm now shows human-readable label (`RSA`, `EC (ECDSA)`, `Ed25519`) instead of raw OID
- **Navbar** — Fingerprint menu item added
- **Home page** — Fingerprint tool card added (grid now shows 6 tools)

### Changed
- **Default theme** changed from dark to light; users who previously selected dark will retain their preference via `localStorage`
- **UI language** fully translated from Indonesian to English across all pages and components
- **SSL Converter** — Legacy 3DES mode for PFX/PKCS#12 is now opt-in (checkbox) instead of the default; modern AES-256 is the new default for both Format Convert and Tomcat Keystore tabs

### Fixed
- `ssl-converter` tests updated to match current 3-argument `convertCert(data, fromFormat, toFormat)` API
- Added `detectFormat()` export to `ssl-converter.ts` (was used in tests but missing from exports)

---

## [v1.0.1] — 2026-06-05

### Added
- **SSL Converter — Private Key tab** — encrypt or decrypt a private key passphrase (AES-256-CBC)
- **SSL Converter — Build PEM Bundle tab** — combine cert + CA chain + optional key into `fullchain.pem`; output order: key → cert → intermediate → rootca
- **SSL Converter — Tomcat Keystore tab** — generate `keystore.p12` (PKCS#12) with full certificate chain, output Tomcat `server.xml` config snippet and `keytool` conversion command
- **SSL Converter — CA chain split mode** — option to provide intermediate CA and root CA as separate files instead of a single bundle, in both Build PEM Bundle and Tomcat Keystore tabs
- **CLI `bundle`** — build `fullchain.pem` from cert + CA chain + optional private key
- **CLI `tomcat`** — build a PKCS#12 keystore for Tomcat with full chain
- **CLI `key`** — encrypt or decrypt a private key passphrase
- **CLI `convert`** — added P7B (PKCS#7) reading support: `P7B → PEM`, `P7B → DER`, `P7B → PFX`
- **CLI page** (`/cli`) — updated command reference with all new commands; `cargo install ssl-tools` marked as coming soon
- **Legacy 3DES PFX mode** (fix for [#1](https://github.com/nugiabdiansyah/ssl-certificate-tools/issues/1))
  - Web: "Legacy Mode (3DES)" opt-in checkbox in Format Convert (PFX output) and Tomcat Keystore tabs
  - CLI: `--legacy` flag for `ssl-tools convert --to pfx` and `ssl-tools tomcat`
  - Equivalent to `openssl pkcs12 -export -legacy`; required for Java < 9, Tomcat < 8.5, IIS

### Fixed
- CI: replaced system OpenSSL dependency with `openssl = { features = ["vendored"] }` — CLI now builds on all GitHub Actions runners (macOS, Linux, Windows) without system OpenSSL
- CI: removed `version: 9` from `pnpm/action-setup@v4` to resolve conflict with `packageManager` field in `package.json`

---

## [v1.0.0] — 2026-06-04

### Added
- **Web app** deployed at [ssl.nugi.biz](https://ssl.nugi.biz) (Next.js 14 App Router, Tailwind CSS v4)
  - Dark/light theme toggle with lightbulb icon, persisted via `localStorage`
  - Responsive layout (max-w-5xl), no-flash theme with inline anti-flash script
- **SSL Checker** (`/ssl-checker`)
  - Full certificate chain display (leaf → intermediate → root) with collapsible cards
  - Trust verification (separate TLS connect with `rejectUnauthorized: true`)
  - IP resolution via `dns.promises.lookup`
  - Server type detection via HTTPS HEAD request (`Server` header)
  - Hostname validity check with wildcard SAN matching
  - Protocol, signature algorithm, expiry status chips
- **Certificate Decoder** (`/cert-decoder`)
  - Parses PEM and DER certificates
  - Displays: CN, Org, Country, Issuer, Serial, validity, Public Key, Signature Algorithm, SANs, Key Usage, SHA-1 and SHA-256 fingerprints
- **CSR Decoder** (`/csr-decoder`)
  - Decodes PKCS#10 CSRs
  - Displays all subject fields, public key info, signature algorithm, SANs
- **Certificate Key Matcher** (`/key-matcher`)
  - Verifies RSA public key modulus match between certificate and private key
- **SSL Converter** (`/ssl-converter`)
  - Format conversions: PEM ↔ DER, PEM → PFX, DER → PFX, PFX → PEM, PEM → P7B, DER → P7B, PFX → P7B
  - Supports passphrase-protected PFX input and output
- **CLI binary** (`ssl-tools`)
  - `check` — connect to domain, display cert status, expiry, issuer, SANs
  - `decode-cert` — parse PEM/DER certificate
  - `decode-csr` — parse PEM CSR
  - `match` — verify key ↔ cert pair
  - `convert` — format conversion (PEM/DER/PFX)
  - `--json` flag on all commands for machine-readable output
- **GitHub Actions** (`cli-release.yml`) — builds and publishes binaries for all 4 platforms on git tag push
- **Dockerfile** for self-hosted web deployment
- **`/cli` page** — install instructions, platform download links, command reference

[v1.0.6]: https://github.com/nugiabdiansyah/ssl-certificate-tools/compare/v1.0.5...v1.0.6
[v1.0.5]: https://github.com/nugiabdiansyah/ssl-certificate-tools/compare/v1.0.4...v1.0.5
[v1.0.2]: https://github.com/nugiabdiansyah/ssl-certificate-tools/compare/v1.0.1...v1.0.2
[v1.0.1]: https://github.com/nugiabdiansyah/ssl-certificate-tools/compare/v1.0.0...v1.0.1
[v1.0.0]: https://github.com/nugiabdiansyah/ssl-certificate-tools/releases/tag/v1.0.0
