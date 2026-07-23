# crates.io First Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified local release commit whose GitHub source, future `v1.0.6` tag, and first manually published `ssl-tools 1.0.6` crate have identical contents.

**Architecture:** Keep first-publish preparation isolated from post-publish website and automation changes. Package metadata, crate-facing documentation, licensing, changelog, and manual release instructions change now; the CLI page warning and crates.io GitHub Action remain unchanged until crates.io confirms the release.

**Tech Stack:** Rust/Cargo, Markdown, GitHub Actions, Next.js/pnpm verification.

## Global Constraints

- The release version is exactly `1.0.6`.
- First crates.io publication is manual.
- Do not push, create a tag, or run a real `cargo publish`.
- Do not remove the CLI page’s “Not yet published” warning.
- Do not add crates.io publication to GitHub Actions yet.
- Do not stage unrelated `.DS_Store` or `graphify-out` files.

---

### Task 1: Make the crate archive publication-ready

**Files:**
- Modify: `apps/cli/Cargo.toml`
- Modify: `apps/cli/Cargo.lock`
- Create: `apps/cli/README.md`
- Create: `apps/cli/LICENSE`
- Create: `LICENSE`

**Interfaces:**
- Consumes: Cargo’s standard `[package]` metadata and package file-selection rules.
- Produces: A `ssl-tools 1.0.6` archive containing `README.md`, `LICENSE`, sources, tests, and lockfile.

- [ ] **Step 1: Run release assertions and confirm they fail before implementation**

Run:

```bash
rtk cargo metadata --manifest-path apps/cli/Cargo.toml --no-deps --format-version 1 | rtk rg '"version":"1\.0\.6"'
rtk cargo package --manifest-path apps/cli/Cargo.toml --allow-dirty --list | rtk rg '^(README\.md|LICENSE)$'
```

Expected: the version assertion finds no `1.0.6`, and the package listing does not contain crate-root `README.md` or `LICENSE`.

- [ ] **Step 2: Update Cargo metadata and lockfile**

Set the package section to:

```toml
[package]
name = "ssl-tools"
version = "1.0.6"
edition = "2021"
description = "SSL certificate utilities CLI for checking, decoding, converting, and creating certificates and CSRs"
license = "MIT"
repository = "https://github.com/nugiabdiansyah/ssl-certificate-tools"
homepage = "https://ssl.nugi.biz/cli"
readme = "README.md"
keywords = ["ssl", "tls", "certificate", "x509", "cli"]
categories = ["command-line-utilities", "cryptography"]
```

Change the local `ssl-tools` package entry in `apps/cli/Cargo.lock` from version `1.0.5` to `1.0.6`.

- [ ] **Step 3: Add the repository and crate license files**

Create both `LICENSE` and `apps/cli/LICENSE` with identical content:

```text
MIT License

Copyright (c) 2026 Nugi Abdiansyah

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Add the crate-specific README**

Create `apps/cli/README.md` with:

```markdown
# ssl-tools

`ssl-tools` is a command-line toolkit for checking, decoding, creating, and
converting SSL/TLS certificates, CSRs, private keys, bundles, and PKCS#12
keystores.

## Install

```bash
cargo install ssl-tools
```

Prebuilt binaries for Linux, macOS, and Windows are also available from
[GitHub Releases](https://github.com/nugiabdiansyah/ssl-certificate-tools/releases).

## Quick start

```bash
ssl-tools check example.com
ssl-tools decode-cert certificate.crt
ssl-tools decode-csr request.csr
ssl-tools create-csr --cn example.com --san example.com --san www.example.com
ssl-tools match certificate.crt private.key
ssl-tools convert cert.pem --to der
ssl-tools bundle certificate.crt --bundle ca_bundle.crt
ssl-tools tomcat certificate.crt --key private.key --bundle ca_bundle.crt
ssl-tools key private.key --encrypt --passphrase secret
```

Run `ssl-tools --help` or `ssl-tools <command> --help` for the full command
reference. JSON output is available on commands that expose `--json`.

## Build notes

The CLI builds OpenSSL from vendored source for consistent cross-platform
behavior. Source installation therefore requires a working native compiler
toolchain in addition to Rust.

The web application and complete documentation are available at
[ssl.nugi.biz](https://ssl.nugi.biz/cli).

## License

MIT — see [LICENSE](LICENSE).
```

- [ ] **Step 5: Re-run package assertions**

Run:

```bash
rtk cargo metadata --manifest-path apps/cli/Cargo.toml --no-deps --format-version 1 | rtk rg '"version":"1\.0\.6"'
rtk cargo package --manifest-path apps/cli/Cargo.toml --allow-dirty --list | rtk rg '^(README\.md|LICENSE)$'
rtk proxy cmp LICENSE apps/cli/LICENSE
```

Expected: version `1.0.6` is found, both package files are listed, and `cmp` exits zero.

### Task 2: Align changelog and manual release documentation

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `.github/workflows/cli-release.yml`

**Interfaces:**
- Consumes: Existing `v1.0.5` history and the tag-triggered binary release workflow.
- Produces: Accurate `v1.0.5`/`v1.0.6` history and a manual first-publish runbook.

- [ ] **Step 1: Add accurate release sections**

Keep `## [Unreleased]` empty. Add:

```markdown
## [v1.0.6] — 2026-07-23

### Added
- **crates.io packaging** — added crate metadata, a CLI-specific README, and MIT license text for the first manual publication.

### Changed
- **CLI version** bumped to `1.0.6`.
- **CLI `create-csr`** accepts `--country-code` as an alias for `--country`.

## [v1.0.5] — 2026-07-03

### Added
- **CLI `create-csr`** — create a CSR with a generated ECDSA/RSA private key or an existing private key.
- **CLI release workflow** — manual `workflow_dispatch` release support while retaining tag-based releases.

### Changed
- **CLI version** bumped to `1.0.5`.
- **CLI `decode-csr` and `decode-cert`** include domain type classification.
- **CSR and key handling** supports ECDSA inputs.
```

Add these link definitions:

```markdown
[v1.0.6]: https://github.com/nugiabdiansyah/ssl-certificate-tools/compare/v1.0.5...v1.0.6
[v1.0.5]: https://github.com/nugiabdiansyah/ssl-certificate-tools/compare/v1.0.4...v1.0.5
```

- [ ] **Step 2: Replace the root release instructions**

Replace the short tag-only instructions with:

````markdown
**First crates.io release (`v1.0.6`):**
```bash
cd apps/cli
cargo test --locked
cargo publish --dry-run --locked
cd ../..

git add apps/cli/Cargo.toml apps/cli/Cargo.lock apps/cli/README.md \
  apps/cli/LICENSE LICENSE README.md CHANGELOG.md
git commit -m "chore: prepare ssl-tools v1.0.6"
git push origin main
git tag v1.0.6
git push origin v1.0.6

cd apps/cli
cargo publish --locked
```

Verify the crate at <https://crates.io/crates/ssl-tools>. Only after it is
available should the CLI page warning be removed and future crates.io
publishing be automated.

The `v1.0.6` tag triggers GitHub Actions to build four platform binaries and
publish the GitHub Release from the same commit.
````

- [ ] **Step 3: Update the workflow’s manual input example only**

Change:

```yaml
description: 'Release tag to publish, for example v1.0.5'
```

to:

```yaml
description: 'Release tag to publish, for example v1.0.6'
```

Do not add a Cargo token or publish step.

- [ ] **Step 4: Verify website truthfulness**

Run:

```bash
rtk rg -n 'Not yet published to crates\.io' apps/web/src/app/cli/page.tsx
rtk rg -n 'cargo publish' .github/workflows
```

Expected: the page warning is still present; no workflow contains a Cargo publish command.

### Task 3: Verify and commit the release candidate

**Files:**
- Test: `docs/superpowers/plans/2026-07-23-crates-io-first-publish.md` for exact scope and command coverage.
- Test: all release files from Tasks 1 and 2.

**Interfaces:**
- Consumes: The complete Stage 1 release candidate.
- Produces: One verified local Git commit; no external state changes.

- [ ] **Step 1: Run Rust verification**

Run:

```bash
rtk cargo test --manifest-path apps/cli/Cargo.toml --locked
rtk cargo package --manifest-path apps/cli/Cargo.toml --allow-dirty --list
rtk cargo publish --dry-run --manifest-path apps/cli/Cargo.toml --locked --allow-dirty
```

Expected: all tests pass, package contains `README.md` and `LICENSE`, and dry-run stops only with “aborting upload due to dry run”.

- [ ] **Step 2: Run web verification**

Run:

```bash
rtk pnpm --filter web test
rtk pnpm --filter web build
```

Expected: web tests and production build pass.

- [ ] **Step 3: Run repository hygiene checks**

Run:

```bash
rtk git diff --check
rtk git status --short
```

Expected: no whitespace errors; only intended release files and this plan are changed, while unrelated untracked files remain unstaged.

- [ ] **Step 4: Commit only intended files**

Stage:

```bash
rtk git add .github/workflows/cli-release.yml CHANGELOG.md LICENSE README.md \
  apps/cli/Cargo.lock apps/cli/Cargo.toml apps/cli/LICENSE apps/cli/README.md \
  docs/superpowers/plans/2026-07-23-crates-io-first-publish.md
```

Commit:

```bash
rtk git commit -m "chore: prepare ssl-tools v1.0.6"
```

Expected: a local commit is created without pushing or tagging.
