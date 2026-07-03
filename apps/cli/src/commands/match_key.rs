use crate::output;
use anyhow::{Context, Result};
use openssl::pkey::PKey;
use openssl::x509::X509;
use serde::Serialize;

#[derive(Serialize)]
pub struct MatchResult {
    pub match_result: bool,
    pub cert_common_name: String,
    pub key_type: String,
    pub explanation: String,
}

pub fn run(cert_file: &str, key_file: &str, json: bool) -> Result<()> {
    let cert_pem =
        std::fs::read(cert_file).with_context(|| format!("Cannot read cert: {}", cert_file))?;
    let key_pem =
        std::fs::read(key_file).with_context(|| format!("Cannot read key: {}", key_file))?;

    let cert = X509::from_pem(&cert_pem)
        .or_else(|_| X509::from_der(&cert_pem))
        .with_context(|| "Invalid certificate format")?;
    let key = PKey::private_key_from_pem(&key_pem).with_context(|| "Invalid private key format")?;

    let cert_pub = cert.public_key()?;
    let is_match = cert_pub.public_eq(&key);

    let cn = cert
        .subject_name()
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
