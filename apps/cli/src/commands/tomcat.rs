use anyhow::{bail, Context, Result};
use openssl::nid::Nid;
use openssl::pkcs12::Pkcs12;
use openssl::pkey::PKey;
use openssl::stack::Stack;
use openssl::x509::X509;

pub fn run(
    cert: &str,
    bundle: Option<&str>,
    intermediate: Option<&str>,
    rootca: Option<&str>,
    key_file: &str,
    passphrase: &str,
    legacy: bool,
    output: Option<&str>,
) -> Result<()> {
    if bundle.is_none() && intermediate.is_none() && rootca.is_none() {
        bail!("CA chain required: provide --bundle, or --intermediate and/or --rootca");
    }

    // Load leaf cert
    let cert_bytes = std::fs::read(cert).with_context(|| format!("Cannot read cert: {}", cert))?;
    let leaf = if cert_bytes.starts_with(b"-----") {
        X509::from_pem(&cert_bytes)?
    } else {
        X509::from_der(&cert_bytes)?
    };

    // Load private key — try unencrypted first, then encrypted with the keystore passphrase
    let key_bytes =
        std::fs::read(key_file).with_context(|| format!("Cannot read key: {}", key_file))?;
    let pkey = PKey::private_key_from_pem(&key_bytes)
        .or_else(|_| PKey::private_key_from_pem_passphrase(&key_bytes, passphrase.as_bytes()))
        .with_context(|| "Cannot read private key — if encrypted, ensure --passphrase matches")?;

    // Build CA chain stack
    let chain_paths: Vec<&str> = if let Some(b) = bundle {
        vec![b]
    } else {
        let mut v = Vec::new();
        if let Some(i) = intermediate {
            v.push(i);
        }
        if let Some(r) = rootca {
            v.push(r);
        }
        v
    };

    let mut ca_stack: Stack<X509> = Stack::new()?;
    for path in &chain_paths {
        for c in load_certs(path)? {
            ca_stack.push(c)?;
        }
    }

    // Build PKCS#12 with full chain
    let mut b = Pkcs12::builder();
    b.name("tomcat").pkey(&pkey).cert(&leaf).ca(ca_stack);
    if legacy {
        // Use legacy 3DES encryption for compatibility with old Java/Tomcat
        b.key_algorithm(Nid::PBE_WITHSHA1AND3_KEY_TRIPLEDES_CBC)
            .cert_algorithm(Nid::PBE_WITHSHA1AND40BITRC2_CBC)
            .mac_iter(2048);
    }
    let p12 = b
        .build2(passphrase)
        .with_context(|| "Failed to build PKCS#12 keystore")?;

    let der = p12.to_der()?;
    let out_path = output.unwrap_or("keystore.p12");
    std::fs::write(out_path, &der).with_context(|| format!("Cannot write: {}", out_path))?;

    crate::output::print_status_ok(&format!("Keystore saved to: {}", out_path));
    println!();
    println!(
        "{}",
        colored::Colorize::dimmed("Tomcat server.xml snippet (PKCS12, recommended):")
    );
    println!(
        r#"  <Certificate certificateKeystoreFile="/opt/tomcat/conf/{}"
               certificateKeystorePassword="{}"
               certificateKeystoreType="PKCS12" />"#,
        out_path, passphrase
    );

    Ok(())
}

fn load_certs(path: &str) -> Result<Vec<X509>> {
    let bytes = std::fs::read(path).with_context(|| format!("Cannot read: {}", path))?;
    if bytes.starts_with(b"-----") {
        X509::stack_from_pem(&bytes)
            .with_context(|| format!("Failed to parse PEM certs from {}", path))
    } else {
        let c = X509::from_der(&bytes)?;
        Ok(vec![c])
    }
}
