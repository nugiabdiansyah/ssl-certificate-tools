use anyhow::{Context, Result};
use ::pem::parse;
use serde::Serialize;
use x509_parser::prelude::*;
use x509_parser::oid_registry::{OID_X509_COMMON_NAME, OID_X509_ORGANIZATION_NAME};
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

    let sans: Vec<String> = cert.subject_alternative_name()
        .ok().flatten()
        .map(|ext| ext.value.general_names.iter()
            .filter_map(|n| if let GeneralName::DNSName(s) = n { Some(s.to_string()) } else { None })
            .collect())
        .unwrap_or_default();

    let common_name = cert.subject()
        .iter_by_oid(&OID_X509_COMMON_NAME)
        .next()
        .and_then(|a| a.as_str().ok())
        .unwrap_or("")
        .to_string();

    let organization = cert.subject()
        .iter_by_oid(&OID_X509_ORGANIZATION_NAME)
        .next()
        .and_then(|a| a.as_str().ok())
        .unwrap_or("")
        .to_string();

    let issuer = cert.issuer()
        .iter_by_oid(&OID_X509_ORGANIZATION_NAME)
        .next()
        .and_then(|a| a.as_str().ok())
        .unwrap_or("")
        .to_string();

    let info = CertInfo {
        common_name,
        organization,
        issuer,
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
