use colored::Colorize;
use serde::Serialize;

pub fn print_field(label: &str, value: &str) {
    println!("{}: {}", label.dimmed(), value.white());
}

pub fn print_list(label: &str, values: &[String]) {
    if values.is_empty() { return; }
    println!("{}: {}", label.dimmed(), values.join(", ").white());
}

pub fn print_status_ok(msg: &str) {
    println!("{} {}", "✓".green().bold(), msg.green().bold());
}

pub fn print_status_err(msg: &str) {
    println!("{} {}", "✗".red().bold(), msg.red().bold());
}

pub fn print_json<T: Serialize>(value: &T) {
    println!("{}", serde_json::to_string_pretty(value).unwrap());
}
