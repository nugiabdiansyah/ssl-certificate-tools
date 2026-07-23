# crates.io First Publish Design

## Goal

Prepare the current repository as a truthful, reproducible `ssl-tools` version
`1.0.6` release candidate for its first manual crates.io publication. The local
commit must be suitable for pushing to GitHub and tagging as `v1.0.6` without
changing the crate contents between GitHub and crates.io.

## Release Strategy

Use a two-stage release.

### Stage 1: Release Candidate

The commit produced now will:

- bump the crate and lockfile from `1.0.5` to `1.0.6`;
- add complete crates.io metadata;
- add MIT license text to both the repository root and the crate package;
- add a crate-specific README that crates.io can render;
- make the changelog accurately distinguish the existing `v1.0.5` release from
  the new `v1.0.6` change;
- document the first-publish commands and the requirement that the Git tag,
  GitHub source, and packaged crate all refer to the same commit.

The commit will not:

- publish to crates.io;
- create or push `v1.0.6`;
- push to GitHub;
- add crates.io automation;
- remove the website warning that the crate is not yet published.

### Stage 2: Post-Publish Follow-Up

After manual publication of `ssl-tools 1.0.6` has succeeded and the crate is
visible on crates.io:

- remove the “Not yet published” warning from the CLI web page;
- link the CLI page to the published crates.io package;
- add a GitHub Actions publishing job for versions after `1.0.6`;
- make the publishing job depend on tests and use the
  `CARGO_REGISTRY_TOKEN` repository secret.

Stage 2 is deliberately a separate commit so the deployed page never claims a
crate is available before the registry confirms it.

## Package Metadata

`apps/cli/Cargo.toml` will use:

- `version = "1.0.6"`
- `description = "SSL certificate utilities CLI for checking, decoding, converting, and creating certificates and CSRs"`
- `license = "MIT"`
- `repository = "https://github.com/nugiabdiansyah/ssl-certificate-tools"`
- `homepage = "https://ssl.nugi.biz/cli"`
- `readme = "README.md"`
- `keywords = ["ssl", "tls", "certificate", "x509", "cli"]`
- `categories = ["command-line-utilities", "cryptography"]`

No `rust-version` will be declared until the minimum supported Rust version is
tested explicitly. No `documentation` URL will be declared because Cargo can
link to docs.rs automatically and this package is primarily a binary crate.

## Package Documentation and License

`apps/cli/README.md` will focus only on the published CLI:

- installation with `cargo install ssl-tools`;
- concise command examples;
- source repository and web application links;
- platform/build note for vendored OpenSSL;
- MIT license statement.

The repository root will receive `LICENSE` so the existing root README link is
valid. `apps/cli/LICENSE` will contain the same MIT license text so it is
included naturally in the `.crate` archive. Both copies will carry copyright
year `2026` and holder `Nugi Abdiansyah`.

## Changelog

The changelog will retain an empty `Unreleased` heading and add:

- `v1.0.6` dated `2026-07-23`, containing the country-code alias support added
  after the `v1.0.5` tag plus crates.io packaging readiness;
- `v1.0.5` dated `2026-07-03`, backfilling the CSR creator and ECDSA CSR/key
  handling work that is currently incorrectly listed as unreleased.

Comparison links will point to the corresponding GitHub tag ranges.

## Release Documentation

The root README release section will describe the manual first-publish order:

1. run Rust tests and `cargo publish --dry-run`;
2. commit the exact release contents;
3. create and push `v1.0.6` from that commit;
4. run `cargo publish --locked` from the same commit;
5. verify `https://crates.io/crates/ssl-tools`;
6. only then update the web page and add future publishing automation.

The existing GitHub Actions workflow remains responsible only for binary
artifacts and the GitHub Release during Stage 1.

## Verification

Stage 1 is complete only when all of the following succeed:

- `cargo test --manifest-path apps/cli/Cargo.toml --locked`
- `cargo package --manifest-path apps/cli/Cargo.toml --list`
- `cargo publish --dry-run --manifest-path apps/cli/Cargo.toml --locked`
- package listing contains `README.md` and `LICENSE`;
- `pnpm --filter web test`
- `pnpm --filter web build`
- `git diff --check`

The final local commit must exclude unrelated untracked `.DS_Store` and
`graphify-out` files.
