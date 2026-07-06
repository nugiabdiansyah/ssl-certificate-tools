use anyhow::Result;
use clap::{Parser, Subcommand};

mod commands;
mod output;

#[derive(Parser)]
#[command(name = "ssl-tools", about = "SSL certificate utilities", version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Check SSL certificate for a domain
    Check {
        domain: String,
        #[arg(long, default_value_t = 443)]
        port: u16,
        #[arg(long)]
        json: bool,
    },
    /// Decode a CSR file
    DecodeCsr {
        file: String,
        #[arg(long)]
        json: bool,
    },
    /// Create a CSR with a generated private key or an existing private key
    CreateCsr {
        /// Certificate common name (CN), e.g. example.com
        #[arg(long, alias = "common-name")]
        cn: String,
        /// Subject Alternative Name DNS entry. Repeat or pass comma-separated values.
        #[arg(long = "san", value_delimiter = ',')]
        sans: Vec<String>,
        /// Subject organization name (O)
        #[arg(long)]
        organization: Option<String>,
        /// Subject organizational unit (OU)
        #[arg(long = "organizational-unit")]
        organizational_unit: Option<String>,
        /// Subject country code (C), e.g. ID or US
        #[arg(long, alias = "country-code")]
        country: Option<String>,
        /// Subject state or province (ST)
        #[arg(long)]
        state: Option<String>,
        /// Subject locality or city (L)
        #[arg(long)]
        locality: Option<String>,
        /// Subject email address
        #[arg(long)]
        email: Option<String>,
        /// Key algorithm for generated private keys
        #[arg(long, default_value = "ecdsa-p384")]
        key_algorithm: String,
        /// Existing private key PEM to use instead of generating a new key
        #[arg(long)]
        key: Option<String>,
        /// Encrypt generated private key with AES-256-CBC
        #[arg(long)]
        encrypt_key: bool,
        /// Password for encrypted generated keys or uploaded encrypted keys
        #[arg(long)]
        passphrase: Option<String>,
        /// CSR output file
        #[arg(long = "csr-output", default_value = "certificate.csr")]
        csr_output: String,
        /// Generated private key output file
        #[arg(long = "key-output", default_value = "private.key")]
        key_output: String,
        #[arg(long)]
        json: bool,
    },
    /// Decode a certificate file
    DecodeCert {
        file: String,
        #[arg(long)]
        json: bool,
    },
    /// Check if a certificate matches a private key
    Match {
        cert_file: String,
        key_file: String,
        #[arg(long)]
        json: bool,
    },
    /// Convert certificate format (PEM / DER / P7B → PEM / DER / PFX)
    Convert {
        file: String,
        #[arg(long)]
        to: String,
        #[arg(long)]
        key: Option<String>,
        #[arg(long)]
        passphrase: Option<String>,
        /// Use legacy 3DES encryption for PFX output (compatible with old Java / Tomcat / IIS)
        #[arg(long)]
        legacy: bool,
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Build fullchain.pem  (order: key → cert → intermediate → rootca)
    Bundle {
        /// Leaf certificate file (.crt / .pem)
        cert: String,
        /// Single CA bundle file (intermediate + root in one file)
        #[arg(long)]
        bundle: Option<String>,
        /// Intermediate CA certificate (used when --bundle is not provided)
        #[arg(long)]
        intermediate: Option<String>,
        /// Root CA certificate (used when --bundle is not provided)
        #[arg(long)]
        rootca: Option<String>,
        /// Private key to include in the bundle (optional, e.g. for HAProxy)
        #[arg(long)]
        key: Option<String>,
        /// Output file [default: fullchain.pem]
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Build a Tomcat PKCS#12 keystore containing the full certificate chain
    Tomcat {
        /// Leaf certificate file (.crt / .pem)
        cert: String,
        /// Single CA bundle file
        #[arg(long)]
        bundle: Option<String>,
        /// Intermediate CA certificate
        #[arg(long)]
        intermediate: Option<String>,
        /// Root CA certificate
        #[arg(long)]
        rootca: Option<String>,
        /// Private key file (required)
        #[arg(long)]
        key: String,
        /// Keystore password [default: changeit]
        #[arg(long, default_value = "changeit")]
        passphrase: String,
        /// Use legacy 3DES encryption (compatible with old Java / Tomcat < 8.5 / JDK < 9)
        #[arg(long)]
        legacy: bool,
        /// Output file [default: keystore.p12]
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Get SHA-1, SHA-256, and Proxmox/PBS format fingerprint from a live endpoint
    Fingerprint {
        /// Host or IP to connect to
        host: String,
        /// Port [default: 443]
        #[arg(long, default_value_t = 443)]
        port: u16,
        /// Show PBS config snippets
        #[arg(long)]
        pbs: bool,
        #[arg(long)]
        json: bool,
    },
    /// Encrypt or decrypt a private key passphrase
    Key {
        /// Private key file (.key / .pem)
        file: String,
        /// Remove passphrase from encrypted key
        #[arg(long)]
        decrypt: bool,
        /// Add passphrase to unencrypted key
        #[arg(long)]
        encrypt: bool,
        /// Current passphrase (for --decrypt) or new passphrase (for --encrypt)
        #[arg(long, required = true)]
        passphrase: String,
        /// Output file [default: private.key or private_encrypted.key]
        #[arg(short, long)]
        output: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Check { domain, port, json } => commands::check::run(&domain, port, json).await,
        Commands::DecodeCsr { file, json } => commands::decode_csr::run(&file, json),
        Commands::CreateCsr {
            cn,
            sans,
            organization,
            organizational_unit,
            country,
            state,
            locality,
            email,
            key_algorithm,
            key,
            encrypt_key,
            passphrase,
            csr_output,
            key_output,
            json,
        } => commands::create_csr::run(
            &cn,
            &sans,
            organization.as_deref(),
            organizational_unit.as_deref(),
            country.as_deref(),
            state.as_deref(),
            locality.as_deref(),
            email.as_deref(),
            &key_algorithm,
            key.as_deref(),
            encrypt_key,
            passphrase.as_deref(),
            Some(&csr_output),
            Some(&key_output),
            json,
        ),
        Commands::DecodeCert { file, json } => commands::decode_cert::run(&file, json),
        Commands::Match {
            cert_file,
            key_file,
            json,
        } => commands::match_key::run(&cert_file, &key_file, json),
        Commands::Convert {
            file,
            to,
            key,
            passphrase,
            legacy,
            output,
        } => commands::convert::run(
            &file,
            &to,
            key.as_deref(),
            passphrase.as_deref(),
            legacy,
            output.as_deref(),
        ),
        Commands::Bundle {
            cert,
            bundle,
            intermediate,
            rootca,
            key,
            output,
        } => commands::bundle::run(
            &cert,
            bundle.as_deref(),
            intermediate.as_deref(),
            rootca.as_deref(),
            key.as_deref(),
            output.as_deref(),
        ),
        Commands::Tomcat {
            cert,
            bundle,
            intermediate,
            rootca,
            key,
            passphrase,
            legacy,
            output,
        } => commands::tomcat::run(
            &cert,
            bundle.as_deref(),
            intermediate.as_deref(),
            rootca.as_deref(),
            &key,
            &passphrase,
            legacy,
            output.as_deref(),
        ),
        Commands::Fingerprint {
            host,
            port,
            pbs,
            json,
        } => commands::fingerprint::run(&host, port, pbs, json).await,
        Commands::Key {
            file,
            decrypt,
            encrypt,
            passphrase,
            output,
        } => commands::key_convert::run(&file, decrypt, encrypt, &passphrase, output.as_deref()),
    }
}
