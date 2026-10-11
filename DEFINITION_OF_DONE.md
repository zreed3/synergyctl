# synergyctl — Definition of Done
**Version:** 0.1.0 · **Status:** 2026-07-04 · **Stage:** alpha · **Distribution:** local only (npm-packable, not published)

> `synergyctl` is a guardrailed TypeScript CLI over the Synergy Wholesale SOAP/WSDL API (domains, DNS, hosting, SSL, Microsoft 365, account metadata) for the Otterblock/PW businesses. It is run by Zach and by agents (via the repo-scoped `synergyctl` Claude skill) to inspect and change live registrar/hosting state — it has already been used against the live API to diagnose a real .au registrant-compliance (COR) failure. For a safety-critical infra CLI, "production-ready" means every destructive operation is gated by an explicit confirm token, no code path can leak a secret into output or logs, and both properties are proven by tests — not just present in the source.

## Production-ready: ~55%
`▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░` — Functionally real and guarded, but the redaction layer can still leak/mis-handle secrets by substring heuristic and the safety paths have only ~3 test cases, so it is not yet safe to rely on blindly.

## Capability status  ✅ done · 🟡 partial · ⛔ missing
| Capability | Status | Reality |
| --- | --- | --- |
| Domains | ✅ | Typed commands in the operation catalog (`src/operations.ts`); `domains list/check/renew` wired and documented in README. |
| DNS | ✅ | `dns records list` etc. mounted via `src/commands/domain-dns.ts`; covered by `tests/domain-dns.test.ts`. |
| Hosting | ✅ | `hosting get <identifier>` present in catalog + `src/commands/services.ts`. |
| SSL | ✅ | `ssl list` and cert operations in catalog (`certID` param defined). |
| Microsoft 365 | ✅ | `m365 clients list` present in catalog + services tree. |
| Account metadata | ✅ | Account/balance operations in the typed v3.17 surface. |
| Confirm-token guard | ✅ | `enforceGuard`/`expectedConfirmToken` in `src/guards.ts`; `operation:resource` token required for all guarded writes; tested in `tests/core.test.ts`. |
| Dry-run guard | ✅ | `--dry-run` short-circuits to a preview before any live call; enforced in `enforceGuard`, tested. |
| Redaction | 🟡 | Exists (`src/redact.ts`) but `shouldRedact` uses substring `includes()` and `SECRET_KEYS` contains the generic token `"key"` — over-redacts benign fields and is not a structured allowlist. **P0.** |
| Live SOAP client / `doctor` | ✅ | `src/soap-client.ts` + `doctor` command reach the live WSDL; used to diagnose the 2026-06-16 COR failure (`support-zachreeder-cor-failure-2026-06-16.log`). |
| Tests | 🟡 | 12 test cases across 3 files for a safety-critical tool; only ~1 redaction case and ~2 guard cases. Guard/redaction coverage is thin. |
| Docs / skill | 🟡 | README, AGENTS.md, coverage matrix, and both `synergyctl` + `synergyctl-maintenance` skills exist and are current-ish, but working tree is dirty (matrix + fixtures modified, untracked files) and continuity rests on one author. |

## Definition of Done — the gates

### 1 · Functional — operations work against the live API with correct typed I/O
- [x] ~59-operation typed v3.17 catalog (`src/operations.ts`) with param definitions and guard classes
- [x] Live SOAP invocation and WSDL reachability proven via `doctor` and a real live diagnosis
- [x] Domains / DNS / hosting / SSL / M365 / account command trees mounted
- [ ] Every catalog operation exercised (typed I/O) against live or fixtured responses — coverage is partial, not exhaustive

### 2 · Interface & output quality (the "polish" for a CLI)
- [x] Clear `--help` for every command (commander-based; `--help` and per-command descriptions present)
- [x] Machine-readable (JSON) output for agent use (`--json` envelope via `src/output.ts`)
- [ ] Actionable error messages — guard errors are good; broader API/network errors not yet uniformly actionable
- [x] Consistent flag/verb naming (`<group> <verb> <resource>`, shared `--dry-run`/`--confirm`)
- [x] Safe defaults (dry-run / confirm-first for guarded writes)

### 3 · Safety & correctness (this is the premium for this tool)
- [x] Confirm-token required on all destructive ops (`enforceGuard` over `billable/destructive/service/credential/email/raw` + all writes)
- [ ] **Redaction is allowlist/structured, not substring-heuristic — no secret can leak.** `shouldRedact` matches by `key.includes(secretKey)` and `SECRET_KEYS` includes the generic `"key"`; this is a heuristic, not a structured allowlist, and has no negative-case test. **P0.**
- [ ] Dry-run diffs are accurate — dry-run previews the payload, but there is no verified before/after diff assertion
- [ ] Guard/redaction paths have real test coverage — present but thin (~1 redaction case, ~2 guard cases)

### 4 · Quality gates — typecheck clean, tests pass (raise coverage on guard+redaction), CI
- [x] `check` (tsc --noEmit), `test` (vitest), `build` (tsup) scripts defined; CI workflow present (`.github/workflows/ci.yml`)
- [ ] Coverage raised on guard + redaction (leak/false-negative cases, contact masking, nested payloads)
- [ ] Working tree clean and CI green on the committed state (currently dirty: `ci.yml`, coverage matrix, `api-surfaces.json` modified; untracked files present)

### 5 · Reliability & ops — handles API/network errors gracefully, rate-limit aware, logs/audit
- [x] Structured error type (`src/errors.ts`, `SynergyctlError` with codes)
- [ ] Graceful API/network/timeout handling with retries as appropriate
- [ ] Rate-limit awareness / backoff
- [ ] Audit log of executed live writes (who/what/when/confirm token) — the COR log is ad hoc, not a standing audit trail

### 6 · Docs & continuity — README + skill current; another person could operate it (reduce bus-factor)
- [x] README, AGENTS.md, coverage matrix, `synergyctl` + `synergyctl-maintenance` skills exist
- [ ] Docs/fixtures reconciled and committed (dirty tree; untracked `commercial-cli-marketing-platform-report.md` and `feature-parity-adg.md` suggest drift/scope creep)
- [ ] A second operator could run a destructive op safely from docs alone (currently 4 commits, single author — real bus-factor risk)

## Gap to production-ready
**P0 — safety:** Replace substring redaction with a structured allowlist. Remove the generic `"key"` from `SECRET_KEYS`, match on exact/normalized key names (or explicit path rules) instead of `key.includes(...)`, and add tests that prove (a) a non-conforming field name cannot leak a secret and (b) benign fields like `pubkey`/`keyword` are not blindly masked. Add real coverage to `enforceGuard` (every guard level, missing/mismatched token, raw `--experimental`).
**P1:** Graceful API/network/rate-limit handling with clear, actionable errors; accurate dry-run before/after diffs; a standing audit log of live writes; clean, committed working tree with CI green.
**P2:** Exhaustive typed-I/O coverage across the full ~59-op catalog; continuity/runbook so a second operator can run any destructive op from docs alone; decide and execute on npm publish vs. deliberate local-only.

## Done =
> Zach and agents can run any destructive operation through `synergyctl` and trust that it will either require an explicit, correct confirm token or refuse — and that nothing it prints or logs can ever expose a secret — because both guarantees are enforced by a structured (non-heuristic) redaction allowlist and proven by tests.
