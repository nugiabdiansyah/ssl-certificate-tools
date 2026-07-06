use std::fs;
use std::process::Command;

use openssl::pkey::PKey;
use openssl::rsa::Rsa;
use tempfile::tempdir;

fn ssl_tools() -> &'static str {
    env!("CARGO_BIN_EXE_ssl-tools")
}

#[test]
fn create_csr_generates_default_ecdsa_key_and_csr() {
    let dir = tempdir().unwrap();
    let csr_path = dir.path().join("request.csr");
    let key_path = dir.path().join("private.key");

    let status = Command::new(ssl_tools())
        .args([
            "create-csr",
            "--cn",
            "cli.example.com",
            "--san",
            "cli.example.com",
            "--san",
            "www.cli.example.com",
            "--csr-output",
            csr_path.to_str().unwrap(),
            "--key-output",
            key_path.to_str().unwrap(),
        ])
        .status()
        .unwrap();

    assert!(status.success());
    let csr = fs::read(&csr_path).unwrap();
    let key = fs::read_to_string(&key_path).unwrap();
    let req = openssl::x509::X509Req::from_pem(&csr).unwrap();

    assert!(key.contains("-----BEGIN PRIVATE KEY-----"));
    assert!(!key.contains("ENCRYPTED"));
    assert_eq!(req.public_key().unwrap().id(), openssl::pkey::Id::EC);
    assert_eq!(req.subject_name().entries().count(), 1);

    let decoded = Command::new(ssl_tools())
        .args(["decode-csr", csr_path.to_str().unwrap()])
        .output()
        .unwrap();
    let stdout = String::from_utf8_lossy(&decoded.stdout);
    assert!(decoded.status.success());
    assert!(stdout.contains("Domain Type: Multi Domain"));
    assert!(stdout.contains("cli.example.com"));
    assert!(stdout.contains("www.cli.example.com"));
}

#[test]
fn create_csr_accepts_country_code_and_ou_for_principal_subject() {
    let dir = tempdir().unwrap();
    let csr_path = dir.path().join("principal.csr");
    let key_path = dir.path().join("principal.key");

    let output = Command::new(ssl_tools())
        .args([
            "create-csr",
            "--cn",
            "principal.example.com",
            "--country-code",
            "ID",
            "--organizational-unit",
            "IT",
            "--csr-output",
            csr_path.to_str().unwrap(),
            "--key-output",
            key_path.to_str().unwrap(),
        ])
        .output()
        .unwrap();

    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );

    let req = openssl::x509::X509Req::from_pem(&fs::read(&csr_path).unwrap()).unwrap();
    let subject = req.subject_name();
    let country = subject
        .entries_by_nid(openssl::nid::Nid::COUNTRYNAME)
        .next()
        .unwrap()
        .data()
        .as_utf8()
        .unwrap();
    let ou = subject
        .entries_by_nid(openssl::nid::Nid::ORGANIZATIONALUNITNAME)
        .next()
        .unwrap()
        .data()
        .as_utf8()
        .unwrap();

    assert_eq!(country.to_string(), "ID");
    assert_eq!(ou.to_string(), "IT");
}

#[test]
fn create_csr_uses_uploaded_private_key_without_writing_new_key() {
    let dir = tempdir().unwrap();
    let csr_path = dir.path().join("uploaded.csr");
    let key_path = dir.path().join("uploaded.key");
    let key = PKey::from_rsa(Rsa::generate(2048).unwrap()).unwrap();
    fs::write(&key_path, key.private_key_to_pem_pkcs8().unwrap()).unwrap();

    let output = Command::new(ssl_tools())
        .args([
            "create-csr",
            "--cn",
            "uploaded.example.com",
            "--key",
            key_path.to_str().unwrap(),
            "--csr-output",
            csr_path.to_str().unwrap(),
        ])
        .output()
        .unwrap();

    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let req = openssl::x509::X509Req::from_pem(&fs::read(&csr_path).unwrap()).unwrap();
    assert_eq!(req.public_key().unwrap().id(), openssl::pkey::Id::RSA);
    assert!(!String::from_utf8_lossy(&output.stdout).contains("private.key"));
}

#[test]
fn create_csr_can_encrypt_generated_private_key() {
    let dir = tempdir().unwrap();
    let csr_path = dir.path().join("encrypted.csr");
    let key_path = dir.path().join("encrypted.key");

    let status = Command::new(ssl_tools())
        .args([
            "create-csr",
            "--cn",
            "encrypted.example.com",
            "--key-algorithm",
            "rsa-4096",
            "--encrypt-key",
            "--passphrase",
            "secret-passphrase",
            "--csr-output",
            csr_path.to_str().unwrap(),
            "--key-output",
            key_path.to_str().unwrap(),
        ])
        .status()
        .unwrap();

    assert!(status.success());
    let encrypted_key = fs::read(&key_path).unwrap();
    assert!(
        String::from_utf8_lossy(&encrypted_key).contains("-----BEGIN ENCRYPTED PRIVATE KEY-----")
    );
    let parsed =
        PKey::private_key_from_pem_passphrase(&encrypted_key, b"secret-passphrase").unwrap();
    assert_eq!(parsed.id(), openssl::pkey::Id::RSA);
    assert_eq!(parsed.bits(), 4096);
}
