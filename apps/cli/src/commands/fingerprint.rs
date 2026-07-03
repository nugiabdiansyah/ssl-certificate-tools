use anyhow::{Context, Result};
use native_tls::TlsConnector;
use openssl::hash::{hash, MessageDigest};
use openssl::x509::X509;
use serde::Serialize;
use std::net::TcpStream;

fn to_colon_hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<_>>()
        .join(":")
}

#[derive(Serialize)]
pub struct FingerprintResult {
    pub host: String,
    pub port: u16,
    pub common_name: String,
    pub issuer: String,
    pub sha1: String,
    pub sha256: String,
    pub proxmox: String,
}

pub async fn run(host: &str, port: u16, pbs: bool, json: bool) -> Result<()> {
    let addr = format!("{}:{}", host, port);
    let stream =
        TcpStream::connect(&addr).with_context(|| format!("Cannot connect to {}", addr))?;

    let connector = TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .build()?;

    let tls = connector
        .connect(host, stream)
        .with_context(|| "TLS handshake failed")?;

    let native_cert = tls.peer_certificate()?.context("No certificate returned")?;
    let der = native_cert.to_der()?;

    let sha1_raw = hash(MessageDigest::sha1(), &der)?;
    let sha256_raw = hash(MessageDigest::sha256(), &der)?;
    let sha1 = to_colon_hex(&sha1_raw);
    let sha256 = to_colon_hex(&sha256_raw);
    let proxmox = format!("sha256:{}", sha256);

    // Parse subject/issuer via openssl X509
    let x509 = X509::from_der(&der)?;

    let cn = x509
        .subject_name()
        .entries_by_nid(openssl::nid::Nid::COMMONNAME)
        .next()
        .and_then(|e| e.data().as_utf8().ok())
        .map(|s| s.to_string())
        .unwrap_or_default();

    let issuer_cn = x509
        .issuer_name()
        .entries_by_nid(openssl::nid::Nid::COMMONNAME)
        .next()
        .and_then(|e| e.data().as_utf8().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            x509.issuer_name()
                .entries_by_nid(openssl::nid::Nid::ORGANIZATIONNAME)
                .next()
                .and_then(|e| e.data().as_utf8().ok())
                .map(|s| s.to_string())
                .unwrap_or_default()
        });

    let result = FingerprintResult {
        host: host.to_string(),
        port,
        common_name: cn,
        issuer: issuer_cn,
        sha1: sha1.clone(),
        sha256: sha256.clone(),
        proxmox: proxmox.clone(),
    };

    if json {
        crate::output::print_json(&result);
        return Ok(());
    }

    // Human-readable output
    crate::output::print_status_ok(&format!("{} ({}:{})", result.common_name, host, port));
    println!();
    crate::output::print_field("Issuer", &result.issuer);
    crate::output::print_field("Fingerprint SHA-1", &result.sha1);
    crate::output::print_field("Fingerprint SHA-256", &result.sha256);
    println!();

    use colored::Colorize;
    println!("{}", "Proxmox / PBS Format:".dimmed());
    println!("  {}", proxmox.bright_cyan().bold());

    if pbs {
        println!();
        println!("{}", "PBS Config Snippets:".dimmed());
        println!();
        println!(
            "  {} (storage.cfg / datastore config)",
            "fingerprint field:".dimmed()
        );
        println!("  {}", sha256.green());
        println!();
        println!("  {} (proxmox-backup-client):", "CLI argument:".dimmed());
        println!("  --fingerprint {}", sha256.green());
    }

    Ok(())
}
