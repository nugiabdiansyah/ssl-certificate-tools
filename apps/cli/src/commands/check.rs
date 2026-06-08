use anyhow::{Context, Result};
use native_tls::TlsConnector;
use openssl::hash::{hash, MessageDigest};
use serde::Serialize;
use std::net::TcpStream;
use x509_parser::prelude::*;
use x509_parser::oid_registry::{
    OID_X509_COMMON_NAME, OID_X509_ORGANIZATION_NAME,
};
use crate::output;

fn to_colon_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02X}", b)).collect::<Vec<_>>().join(":")
}

#[derive(Serialize)]
pub struct SslCheckResult {
    pub status: String,
    pub days_remaining: i64,
    pub issued_to: String,
    pub issuer: String,
    pub valid_from: String,
    pub valid_to: String,
    pub protocol: String,
    pub sha1_fingerprint: String,
    pub sha256_fingerprint: String,
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

    let der = cert.to_der()?;
    let (_, parsed) = X509Certificate::from_der(&der)
        .with_context(|| "Failed to parse certificate from server")?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_secs() as i64;

    let not_after = parsed.validity().not_after.timestamp();
    let days_remaining = (not_after - now) / 86400;

    let sans: Vec<String> = parsed.subject_alternative_name()
        .ok().flatten()
        .map(|ext| ext.value.general_names.iter()
            .filter_map(|n| if let GeneralName::DNSName(s) = n { Some(s.to_string()) } else { None })
            .collect())
        .unwrap_or_default();

    let issued_to = parsed.subject()
        .iter_by_oid(&OID_X509_COMMON_NAME)
        .next()
        .and_then(|a| a.as_str().ok())
        .unwrap_or("")
        .to_string();

    let issuer = parsed.issuer()
        .iter_by_oid(&OID_X509_ORGANIZATION_NAME)
        .next()
        .and_then(|a| a.as_str().ok())
        .unwrap_or("")
        .to_string();

    let sha1_raw   = hash(MessageDigest::sha1(), &der)?;
    let sha256_raw = hash(MessageDigest::sha256(), &der)?;

    let result = SslCheckResult {
        status: if days_remaining >= 0 { "valid".into() } else { "expired".into() },
        days_remaining,
        issued_to,
        issuer,
        valid_from: parsed.validity().not_before.to_rfc2822().unwrap_or_default(),
        valid_to: parsed.validity().not_after.to_rfc2822().unwrap_or_default(),
        protocol: "TLS".to_string(),
        sha1_fingerprint:   to_colon_hex(&sha1_raw),
        sha256_fingerprint: to_colon_hex(&sha256_raw),
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
        output::print_field("Issued To",         &result.issued_to);
        output::print_field("Issuer",            &result.issuer);
        output::print_field("Valid From",        &result.valid_from);
        output::print_field("Valid To",          &result.valid_to);
        output::print_field("Protocol",          &result.protocol);
        output::print_field("Fingerprint SHA-1",   &result.sha1_fingerprint);
        output::print_field("Fingerprint SHA-256", &result.sha256_fingerprint);
        output::print_list("SANs",               &result.sans);
    }

    Ok(())
}
