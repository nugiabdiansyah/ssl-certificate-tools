use anyhow::{bail, Context, Result};
use openssl::nid::Nid;
use openssl::pkcs12::Pkcs12;
use openssl::pkcs7::Pkcs7;
use openssl::pkey::PKey;
use openssl::x509::X509;
use std::path::Path;

pub fn run(
    file: &str,
    to: &str,
    key_file: Option<&str>,
    passphrase: Option<&str>,
    legacy: bool,
    output_path: Option<&str>,
) -> Result<()> {
    let input = std::fs::read(file)
        .with_context(|| format!("Cannot read file: {}", file))?;

    let ext = Path::new(file)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    // Detect if input is P7B
    let is_p7b = ext == "p7b" || ext == "p7c"
        || input.starts_with(b"-----BEGIN PKCS7")
        || input.starts_with(b"-----BEGIN PKCS #7");

    // Parse input cert(s)
    let certs: Vec<X509> = if is_p7b {
        parse_p7b(&input)?
    } else if input.starts_with(b"-----") {
        vec![X509::from_pem(&input)?]
    } else if ext == "p12" || ext == "pfx" {
        let pass = passphrase.unwrap_or("");
        let p12 = Pkcs12::from_der(&input)?;
        let parsed = p12.parse2(pass)?;
        let cert = parsed.cert.context("No certificate in PFX")?;
        vec![cert]
    } else {
        vec![X509::from_der(&input)?]
    };

    if certs.is_empty() {
        bail!("No certificates found in input file");
    }

    let output_data: Vec<u8> = match to.to_lowercase().as_str() {
        "pem" => certs
            .iter()
            .map(|c| c.to_pem())
            .collect::<std::result::Result<Vec<_>, _>>()?
            .concat(),
        "der" => certs[0].to_der()?,
        "p7b" => bail!("P7B output is not supported in CLI. Use the web tool for PEM/DER → P7B."),
        "pfx" | "p12" => {
            let key_path = key_file.context("--key <key-file> is required for PFX output")?;
            let key_pem = std::fs::read(key_path)?;
            let pass = passphrase.unwrap_or("");
            let key = PKey::private_key_from_pem(&key_pem)
                .or_else(|_| PKey::private_key_from_pem_passphrase(&key_pem, pass.as_bytes()))?;
            let mut b = Pkcs12::builder();
            b.name("certificate").pkey(&key).cert(&certs[0]);
            if legacy {
                b.key_algorithm(Nid::PBE_WITHSHA1AND3_KEY_TRIPLEDES_CBC)
                 .cert_algorithm(Nid::PBE_WITHSHA1AND40BITRC2_CBC)
                 .mac_iter(2048);
            }
            b.build2(pass)?.to_der()?
        }
        _ => bail!("Unsupported target format: '{}'. Choose: pem, der, pfx.", to),
    };

    let to_lower = to.to_lowercase();
    let ext_out = match to_lower.as_str() {
        "pfx" | "p12" => "pfx",
        other => other,
    };
    let out_path = output_path.map(|s| s.to_string()).unwrap_or_else(|| {
        let stem = Path::new(file).file_stem().and_then(|s| s.to_str()).unwrap_or("certificate");
        format!("{}.{}", stem, ext_out)
    });

    std::fs::write(&out_path, &output_data)
        .with_context(|| format!("Cannot write output to {}", out_path))?;

    crate::output::print_status_ok(&format!("Converted and saved to: {}", out_path));
    Ok(())
}

fn parse_p7b(input: &[u8]) -> Result<Vec<X509>> {
    let p7 = if input.starts_with(b"-----") {
        Pkcs7::from_pem(input)?
    } else {
        Pkcs7::from_der(input)?
    };
    // certificates() is on Pkcs7SignedRef (the SignedData variant)
    let certs = p7
        .signed()
        .and_then(|s| s.certificates())
        .map(|s| s.iter().map(|c| c.to_owned()).collect::<Vec<_>>())
        .unwrap_or_default();
    if certs.is_empty() {
        bail!("No certificates found in P7B file");
    }
    Ok(certs)
}
