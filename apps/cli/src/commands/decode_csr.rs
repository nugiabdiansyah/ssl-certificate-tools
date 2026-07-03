use crate::{commands::domain, output};
use ::pem::parse;
use anyhow::{Context, Result};
use serde::Serialize;
use x509_parser::oid_registry::{
    OID_X509_COMMON_NAME, OID_X509_COUNTRY_NAME, OID_X509_LOCALITY_NAME,
    OID_X509_ORGANIZATION_NAME, OID_X509_STATE_OR_PROVINCE_NAME,
};
use x509_parser::prelude::*;

const PK_OID_RSA: &str = "1.2.840.113549.1.1.1";
const PK_OID_EC: &str = "1.2.840.10045.2.1";
const PK_OID_ED25519: &str = "1.3.101.112";
const PK_OID_ED448: &str = "1.3.101.113";

fn public_key_label(oid: &str) -> &str {
    match oid {
        PK_OID_RSA => "RSA",
        PK_OID_EC => "EC (ECDSA)",
        PK_OID_ED25519 => "Ed25519",
        PK_OID_ED448 => "Ed448",
        other => other,
    }
}

#[derive(Serialize)]
pub struct CsrInfo {
    pub common_name: String,
    pub organization: String,
    pub country: String,
    pub state: String,
    pub locality: String,
    pub public_key_algorithm: String,
    pub signature_algorithm: String,
    pub domain_type: String,
    pub sans: Vec<String>,
}

pub fn run(file: &str, json: bool) -> Result<()> {
    let content =
        std::fs::read_to_string(file).with_context(|| format!("Cannot read file: {}", file))?;
    let pem = parse(content.trim()).with_context(|| "Invalid PEM format")?;
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

    let sans: Vec<String> = csr
        .requested_extensions()
        .map(|extensions| {
            extensions
                .filter_map(|extension| match extension {
                    ParsedExtension::SubjectAlternativeName(san) => Some(
                        san.general_names
                            .iter()
                            .filter_map(|name| {
                                if let GeneralName::DNSName(value) = name {
                                    Some(value.to_string())
                                } else {
                                    None
                                }
                            })
                            .collect::<Vec<_>>(),
                    ),
                    _ => None,
                })
                .flatten()
                .collect()
        })
        .unwrap_or_default();

    let common_name = get_attr(&OID_X509_COMMON_NAME);
    let pk_oid = csr
        .certification_request_info
        .subject_pki
        .algorithm
        .algorithm
        .to_id_string();

    let info = CsrInfo {
        domain_type: domain::classify(&common_name, &sans),
        common_name,
        organization: get_attr(&OID_X509_ORGANIZATION_NAME),
        country: get_attr(&OID_X509_COUNTRY_NAME),
        state: get_attr(&OID_X509_STATE_OR_PROVINCE_NAME),
        locality: get_attr(&OID_X509_LOCALITY_NAME),
        public_key_algorithm: public_key_label(&pk_oid).to_string(),
        signature_algorithm: csr.signature_algorithm.algorithm.to_id_string(),
        sans,
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
        output::print_field("Domain Type", &info.domain_type);
        output::print_list("SANs", &info.sans);
    }
    Ok(())
}
