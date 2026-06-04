use clap::{Parser, Subcommand};
use anyhow::Result;

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
    Check {
        domain: String,
        #[arg(long, default_value_t = 443)]
        port: u16,
        #[arg(long)]
        json: bool,
    },
    DecodeCsr {
        file: String,
        #[arg(long)]
        json: bool,
    },
    DecodeCert {
        file: String,
        #[arg(long)]
        json: bool,
    },
    Match {
        cert_file: String,
        key_file: String,
        #[arg(long)]
        json: bool,
    },
    Convert {
        file: String,
        #[arg(long)]
        to: String,
        #[arg(long)]
        key: Option<String>,
        #[arg(long)]
        passphrase: Option<String>,
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
        Commands::DecodeCert { file, json } => commands::decode_cert::run(&file, json),
        Commands::Match { cert_file, key_file, json } => commands::match_key::run(&cert_file, &key_file, json),
        Commands::Convert { file, to, key, passphrase, output } => commands::convert::run(&file, &to, key.as_deref(), passphrase.as_deref(), output.as_deref()),
    }
}
