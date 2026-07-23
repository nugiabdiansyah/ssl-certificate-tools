# crates.io Post-Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the website truthfully advertise the published crate and automate synchronized crates.io/GitHub releases for versions after `1.0.6`.

**Architecture:** Keep `v1.0.6` anchored to the exact manually published commit `5b61052`. Update the website on the next commit. Extend the existing tag workflow so tests gate both binary builds and crates.io publication, while GitHub Release creation waits for both on tag pushes.

**Tech Stack:** Next.js, GitHub Actions, Rust/Cargo, Jest.

## Global Constraints

- `ssl-tools 1.0.6` is already published from commit `5b61052`.
- The future `v1.0.6` tag must point to `5b61052`, not the post-publish commit.
- Workflow-based crate publication runs only for tag pushes, not manual dispatches.
- The workflow reads crates.io credentials only from the `CARGO_REGISTRY_TOKEN` GitHub secret.
- Do not push, create a tag, or publish another crate in this task.

---

### Task 1: Update public installation documentation

**Files:**
- Modify: `apps/web/src/app/cli/page.tsx`
- Modify: `README.md`

- [ ] Verify the current page contains “Not yet published” and no crates.io package link.
- [ ] Replace the warning with a link to `https://crates.io/crates/ssl-tools`.
- [ ] Add `cargo install ssl-tools` to the root README installation section.
- [ ] Replace the first-publish runbook with exact `v1.0.6` tag instructions for commit `5b61052` plus a generic future release flow.
- [ ] Run `pnpm --filter web test` and `pnpm --filter web build`.

### Task 2: Gate future releases through tests and crates.io

**Files:**
- Modify: `.github/workflows/cli-release.yml`

- [ ] Add a Rust `test` job running `cargo test --locked` in `apps/cli`.
- [ ] Make the platform `build` job depend on `test`.
- [ ] Add `publish_crate`, depending on `test` and running only for tag pushes.
- [ ] Validate that `github.ref_name` equals `v` plus the Cargo package version.
- [ ] Publish with `cargo publish --locked` and step-level `CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN }}`.
- [ ] Make the GitHub Release wait for `build` and `publish_crate` on tag pushes while retaining manual binary releases.
- [ ] Parse the workflow as YAML and inspect the resulting job dependencies.

### Task 3: Verify and commit

**Files:**
- Add: `docs/superpowers/plans/2026-07-23-crates-io-post-publish.md`
- Test: all files above.

- [ ] Run Rust tests, web tests, web production build, and `git diff --check`.
- [ ] Confirm `cargo info ssl-tools` reports version `1.0.6`.
- [ ] Stage only the page, README, workflow, and this plan.
- [ ] Commit locally with `docs: enable crates.io install and future publishing`.
- [ ] Leave `.DS_Store` and `graphify-out` unstaged.
