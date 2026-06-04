use anyhow::{Context, Result};
use ::pem::parse;
use serde::Serialize;
use x509_parser::prelude::*;
use x509_parser::oid_registry::{
    OID_X509_COMMON_NAME, OID_X509_ORGANIZATION_NAME,
    OID_X509_COUNTRY_NAME, OID_X509_STATE_OR_PROVINCE_NAME, OID_X509_LOCALITY_NAME,
};
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

    let subject = &csr.certification_request_info.subject;

    let get_attr = |oid: &x509_parser::oid_registry::Oid| -> String {
        subject
            .iter_by_oid(oid)
            .next()
            .and_then(|a| a.as_str().ok())
            .unwrap_or("")
            .to_string()
    };

    let info = CsrInfo {
        common_name: get_attr(&OID_X509_COMMON_NAME),
        organization: get_attr(&OID_X509_ORGANIZATION_NAME),
        country: get_attr(&OID_X509_COUNTRY_NAME),
        state: get_attr(&OID_X509_STATE_OR_PROVINCE_NAME),
        locality: get_attr(&OID_X509_LOCALITY_NAME),
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
