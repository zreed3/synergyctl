---
name: synergyctl-maintenance
description: Maintain synergyctl docs, fixtures, CI, skill bundles, and coverage artifacts; edit runtime code only when the user asks for implementation.
---

# synergyctl Maintenance

Use this skill when the user asks to add or update repo docs, agent docs, skill bundles, Claude Code commands, fixtures, coverage artifacts, or CI validation for `synergyctl`.

## Workflow

1. Read `README.md`, `AGENTS.md`, `docs/api-coverage-matrix.md`, `fixtures/coverage/api-surfaces.json`, `LICENSE`, and `NOTICE`.
2. Make additive changes only in docs, skills, CI, fixtures, or coverage artifacts unless the user explicitly asks for implementation.
3. Keep the Codex skill and Claude skill bundles aligned when the repo contract changes.
4. Update the coverage matrix and fixture ids together.
5. Run the narrowest validation that proves the change.

## Reference

Read [references/repo-contract.md](references/repo-contract.md) for the canonical file map and update rules.
