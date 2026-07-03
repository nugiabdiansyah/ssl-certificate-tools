use anyhow::{bail, Context, Result};
use openssl::ec::{EcGroup, EcKey};
use openssl::hash::MessageDigest;
use openssl::nid::Nid;
use openssl::pkey::{Id, PKey, Private};
use openssl::rsa::Rsa;
use openssl::stack::Stack;
use openssl::symm::Cipher;
use openssl::x509::extension::SubjectAlternativeName;
use openssl::x509::{X509NameBuilder, X509ReqBuilder};
use serde::Serialize;

use crate::output;

#[derive(Serialize)]
struct CreateCsrInfo {
    common_name: String,
    sans: Vec<String>,
    key_algorithm: String,
    signature_algorithm: String,
    csr_output: String,
    key_output: Option<String>,
    encrypted_private_key: bool,
    used_existing_key: bool,
}

#[allow(clippy::too_many_arguments)]
pub fn run(
    common_name: &str,
    sans: &[String],
    organization: Option<&str>,
    organizational_unit: Option<&str>,
    country: Option<&str>,
    state: Option<&str>,
    locality: Option<&str>,
    email: Option<&str>,
    key_algorithm: &str,
    key_file: Option<&str>,
    encrypt_key: bool,
    passphrase: Option<&str>,
    csr_output: Option<&str>,
    key_output: Option<&str>,
    json: bool,
) -> Result<()> {
    if common_name.trim().is_empty() {
        bail!("Common Name is required");
    }
    if encrypt_key && passphrase.unwrap_or("").is_empty() {
        bail!("--passphrase is required when --encrypt-key is used");
    }

    let used_existing_key = key_file.is_some();
    let private_key = match key_file {
        Some(path) => read_private_key(path, passphrase)?,
        None => generate_private_key(key_algorithm)?,
    };

    let csr_pem = build_csr(
        &private_key,
        common_name,
        sans,
        organization,
        organizational_unit,
        country,
        state,
        locality,
        email,
    )?;

    let csr_path = csr_output.unwrap_or("certificate.csr").to_string();
    std::fs::write(&csr_path, csr_pem).with_context(|| format!("Cannot write: {}", csr_path))?;

    let key_path = if used_existing_key {
        None
    } else {
        let path = key_output.unwrap_or("private.key").to_string();
        let key_pem = if encrypt_key {
            private_key.private_key_to_pem_pkcs8_passphrase(
                Cipher::aes_256_cbc(),
                passphrase.unwrap_or("").as_bytes(),
            )?
        } else {
            private_key.private_key_to_pem_pkcs8()?
        };
        std::fs::write(&path, key_pem).with_context(|| format!("Cannot write: {}", path))?;
        Some(path)
    };

    let info = CreateCsrInfo {
        common_name: common_name.to_string(),
        sans: normalized_sans(sans),
        key_algorithm: key_label(&private_key),
        signature_algorithm: signature_label(&private_key).to_string(),
        csr_output: csr_path,
        key_output: key_path,
        encrypted_private_key: encrypt_key,
        used_existing_key,
    };

    if json {
        output::print_json(&info);
    } else {
        output::print_status_ok(&format!("CSR saved to: {}", info.csr_output));
        if let Some(path) = &info.key_output {
            output::print_status_ok(&format!("Private key saved to: {}", path));
        }
        output::print_field("Common Name", &info.common_name);
        output::print_field("Key Algorithm", &info.key_algorithm);
        output::print_field("Signature Algorithm", &info.signature_algorithm);
        output::print_field(
            "Private Key Encrypted",
            if info.encrypted_private_key {
                "yes"
            } else {
                "no"
            },
        );
        output::print_list("SANs", &info.sans);
    }

    Ok(())
}

fn read_private_key(path: &str, passphrase: Option<&str>) -> Result<PKey<Private>> {
    let key_bytes = std::fs::read(path).with_context(|| format!("Cannot read key: {}", path))?;
    if let Some(passphrase) = passphrase.filter(|value| !value.is_empty()) {
        PKey::private_key_from_pem_passphrase(&key_bytes, passphrase.as_bytes())
            .with_context(|| "Failed to read encrypted private key")
    } else {
        PKey::private_key_from_pem(&key_bytes)
            .with_context(|| "Failed to read private key; pass --passphrase if it is encrypted")
    }
}

fn generate_private_key(algorithm: &str) -> Result<PKey<Private>> {
    match algorithm {
        "rsa-2048" => Ok(PKey::from_rsa(Rsa::generate(2048)?)?),
        "rsa-4096" => Ok(PKey::from_rsa(Rsa::generate(4096)?)?),
        "ecdsa-p256" => ec_key(Nid::X9_62_PRIME256V1),
        "ecdsa-p384" => ec_key(Nid::SECP384R1),
        "ecdsa-p521" => ec_key(Nid::SECP521R1),
        other => bail!("Unsupported key algorithm: {}", other),
    }
}

fn ec_key(nid: Nid) -> Result<PKey<Private>> {
    let group = EcGroup::from_curve_name(nid)?;
    Ok(PKey::from_ec_key(EcKey::generate(&group)?)?)
}

#[allow(clippy::too_many_arguments)]
fn build_csr(
    private_key: &PKey<Private>,
    common_name: &str,
    sans: &[String],
    organization: Option<&str>,
    organizational_unit: Option<&str>,
    country: Option<&str>,
    state: Option<&str>,
    locality: Option<&str>,
    email: Option<&str>,
) -> Result<Vec<u8>> {
    let mut req = X509ReqBuilder::new()?;
    req.set_pubkey(private_key)?;

    let mut name = X509NameBuilder::new()?;
    append_name(&mut name, Nid::COMMONNAME, Some(common_name))?;
    append_name(&mut name, Nid::ORGANIZATIONNAME, organization)?;
    append_name(&mut name, Nid::ORGANIZATIONALUNITNAME, organizational_unit)?;
    append_name(&mut name, Nid::COUNTRYNAME, country)?;
    append_name(&mut name, Nid::STATEORPROVINCENAME, state)?;
    append_name(&mut name, Nid::LOCALITYNAME, locality)?;
    append_name(&mut name, Nid::PKCS9_EMAILADDRESS, email)?;
    req.set_subject_name(&name.build())?;

    let sans = normalized_sans(sans);
    if !sans.is_empty() {
        let mut san_builder = SubjectAlternativeName::new();
        for name in &sans {
            san_builder.dns(name);
        }
        let extension = san_builder.build(&req.x509v3_context(None))?;
        let mut extensions = Stack::new()?;
        extensions.push(extension)?;
        req.add_extensions(&extensions)?;
    }

    req.sign(private_key, signature_digest(private_key))?;
    Ok(req.build().to_pem()?)
}

fn append_name(builder: &mut X509NameBuilder, nid: Nid, value: Option<&str>) -> Result<()> {
    if let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) {
        builder.append_entry_by_nid(nid, value)?;
    }
    Ok(())
}

fn normalized_sans(sans: &[String]) -> Vec<String> {
    let mut names = sans
        .iter()
        .flat_map(|value| value.split(','))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();
    names.sort();
    names.dedup();
    names
}

fn key_label(key: &PKey<Private>) -> String {
    match key.id() {
        Id::RSA => format!("RSA {}", key.bits()),
        Id::EC => format!(
            "ECDSA {}",
            ec_curve_label(key).unwrap_or_else(|| format!("{}-bit", key.bits()))
        ),
        _ => format!("{:?} {}", key.id(), key.bits()),
    }
}

fn ec_curve_label(key: &PKey<Private>) -> Option<String> {
    let ec_key = key.ec_key().ok()?;
    let curve = ec_key.group().curve_name()?;
    Some(match curve {
        Nid::X9_62_PRIME256V1 => "P-256".to_string(),
        Nid::SECP384R1 => "P-384".to_string(),
        Nid::SECP521R1 => "P-521".to_string(),
        other => format!("{:?}", other),
    })
}

fn signature_digest(key: &PKey<Private>) -> MessageDigest {
    if key.id() == Id::EC && key.bits() > 384 {
        MessageDigest::sha512()
    } else if key.id() == Id::EC && key.bits() > 256 {
        MessageDigest::sha384()
    } else {
        MessageDigest::sha256()
    }
}

fn signature_label(key: &PKey<Private>) -> &'static str {
    if key.id() == Id::RSA {
        "sha256WithRSAEncryption"
    } else if key.id() == Id::EC && key.bits() > 384 {
        "ecdsa-with-SHA512"
    } else if key.id() == Id::EC && key.bits() > 256 {
        "ecdsa-with-SHA384"
    } else {
        "ecdsa-with-SHA256"
    }
}
