use std::collections::BTreeSet;

pub fn classify(common_name: &str, sans: &[String]) -> String {
    let names: BTreeSet<String> = std::iter::once(common_name)
        .chain(sans.iter().map(String::as_str))
        .map(|name| name.trim().to_ascii_lowercase())
        .filter(|name| !name.is_empty())
        .collect();

    if names.is_empty() {
        "Unknown".to_string()
    } else if names.iter().any(|name| name.starts_with("*.")) {
        "Wildcard".to_string()
    } else if names.len() > 1 {
        "Multi Domain".to_string()
    } else {
        "Single Domain".to_string()
    }
}
