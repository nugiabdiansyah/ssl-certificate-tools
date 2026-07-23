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
