use anyhow::{bail, Context, Result};
use openssl::pkcs12::Pkcs12;
use openssl::pkey::PKey;
use openssl::x509::X509;
use std::path::Path;

pub fn run(
    file: &str,
    to: &str,
    key_file: Option<&str>,
    passphrase: Option<&str>,
    output_path: Option<&str>,
) -> Result<()> {
    let input = std::fs::read(file)
        .with_context(|| format!("Cannot read file: {}", file))?;

    let output_data: Vec<u8> = match to.to_lowercase().as_str() {
        "pem" => {
            let cert = if input.starts_with(b"-----") {
                X509::from_pem(&input)?
            } else if file.ends_with(".p12") || file.ends_with(".pfx") {
                let pass = passphrase.unwrap_or("");
                let p12 = Pkcs12::from_der(&input)?;
                let parsed = p12.parse2(pass)?;
                parsed.cert.context("No certificate in PFX")?
            } else {
                X509::from_der(&input)?
            };
            cert.to_pem()?
        }
        "der" => {
            let cert = if input.starts_with(b"-----") {
                X509::from_pem(&input)?
            } else {
                X509::from_der(&input)?
            };
            cert.to_der()?
        }
        "pfx" | "p12" => {
            let cert = if input.starts_with(b"-----") {
                X509::from_pem(&input)?
            } else {
                X509::from_der(&input)?
            };
            let key_path = key_file.context("--key <private-key-file> is required for PFX conversion")?;
            let key_pem = std::fs::read(key_path)?;
            let key = PKey::private_key_from_pem(&key_pem)?;
            let pass = passphrase.unwrap_or("");
            let p12 = Pkcs12::builder()
                .name("certificate")
                .pkey(&key)
                .cert(&cert)
                .build2(pass)?;
            p12.to_der()?
        }
        _ => bail!("Unsupported format: {}. Choose pem, der, or pfx.", to),
    };

    let ext = match to.to_lowercase().as_str() {
        "pem" => "pem",
        "der" => "der",
        "pfx" | "p12" => "pfx",
        _ => to,
    };

    let out_path = output_path.map(|s| s.to_string()).unwrap_or_else(|| {
        let stem = Path::new(file).file_stem().and_then(|s| s.to_str()).unwrap_or("certificate");
        format!("{}.{}", stem, ext)
    });

    std::fs::write(&out_path, &output_data)
        .with_context(|| format!("Cannot write output to {}", out_path))?;

    println!("Converted and saved to: {}", out_path);
    Ok(())
}
