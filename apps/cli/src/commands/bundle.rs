use anyhow::{bail, Context, Result};

pub fn run(
    cert: &str,
    bundle: Option<&str>,
    intermediate: Option<&str>,
    rootca: Option<&str>,
    key: Option<&str>,
    output: Option<&str>,
) -> Result<()> {
    if bundle.is_none() && intermediate.is_none() && rootca.is_none() {
        bail!("CA chain required: provide --bundle, or --intermediate and/or --rootca");
    }

    let mut parts: Vec<String> = Vec::new();

    // Order: key → cert → intermediate → rootca
    if let Some(k) = key {
        parts.push(read_pem(k)?);
    }
    parts.push(read_pem(cert)?);

    if let Some(b) = bundle {
        parts.push(read_pem(b)?);
    } else {
        if let Some(i) = intermediate {
            parts.push(read_pem(i)?);
        }
        if let Some(r) = rootca {
            parts.push(read_pem(r)?);
        }
    }

    let pem_out = parts.join("\n\n") + "\n";
    let out_path = output.unwrap_or("fullchain.pem");
    std::fs::write(out_path, pem_out.as_bytes())
        .with_context(|| format!("Cannot write to {}", out_path))?;

    crate::output::print_status_ok(&format!("Saved to: {}", out_path));

    Ok(())
}

fn read_pem(path: &str) -> Result<String> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Cannot read: {}", path))?;
    if !content.contains("-----BEGIN") {
        bail!("{} does not appear to be a PEM file", path);
    }
    Ok(content.trim_end().to_string())
}
