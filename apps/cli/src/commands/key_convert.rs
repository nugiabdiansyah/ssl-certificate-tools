use anyhow::{bail, Context, Result};
use openssl::pkey::PKey;
use openssl::symm::Cipher;

pub fn run(
    file: &str,
    decrypt: bool,
    encrypt: bool,
    passphrase: &str,
    output: Option<&str>,
) -> Result<()> {
    if !decrypt && !encrypt {
        bail!("Specify --decrypt (remove passphrase) or --encrypt (add passphrase)");
    }

    let key_bytes = std::fs::read(file).with_context(|| format!("Cannot read: {}", file))?;

    let out_bytes: Vec<u8> = if decrypt {
        let key = PKey::private_key_from_pem_passphrase(&key_bytes, passphrase.as_bytes())
            .with_context(|| "Failed to decrypt — wrong passphrase or unsupported format")?;
        key.private_key_to_pem_pkcs8()?
    } else {
        let key = PKey::private_key_from_pem(&key_bytes)
            .with_context(|| "Failed to read key — if already encrypted, use --decrypt first")?;
        key.private_key_to_pem_pkcs8_passphrase(Cipher::aes_256_cbc(), passphrase.as_bytes())?
    };

    let out_path = if let Some(p) = output {
        p.to_string()
    } else if decrypt {
        "private.key".to_string()
    } else {
        "private_encrypted.key".to_string()
    };

    std::fs::write(&out_path, &out_bytes).with_context(|| format!("Cannot write: {}", out_path))?;

    if decrypt {
        crate::output::print_status_ok(&format!("Passphrase removed. Saved to: {}", out_path));
    } else {
        crate::output::print_status_ok(&format!(
            "Key encrypted (AES-256-CBC). Saved to: {}",
            out_path
        ));
    }

    Ok(())
}
