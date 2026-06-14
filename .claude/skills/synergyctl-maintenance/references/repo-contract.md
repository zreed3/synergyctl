# Repo Contract

This repository is a TypeScript CLI plus docs and agent contract. Treat these files as canonical:

- `README.md`
- `AGENTS.md`
- `docs/license-guidance.md`
- `docs/api-coverage-matrix.md`
- `fixtures/coverage/api-surfaces.json`
- `package.json`
- `src/**/*.ts`
- `tests/**/*.test.ts`
- `LICENSE`
- `NOTICE`
- `skills/synergyctl/SKILL.md`
- `skills/synergyctl-maintenance/SKILL.md`
- `.claude/skills/synergyctl/SKILL.md`
- `.claude/skills/synergyctl-maintenance/SKILL.md`
- `.claude/commands/*.md`
- `.github/workflows/ci.yml`

## Update rules

- Keep the Claude skill and Codex skill bundles in sync.
- Keep typed command coverage, fixtures, and docs aligned when the operation catalog changes.
- When the surface inventory changes, update `fixtures/coverage/api-surfaces.json` and `docs/api-coverage-matrix.md` in the same change.
- Keep license wording and notice wording aligned with `docs/license-guidance.md`, `LICENSE`, and `NOTICE`.
- Prefer small additive edits over broad rewrites unless the CLI implementation needs a coordinated change.

## Validation order

1. Confirm every referenced file exists.
2. Confirm every surface id in the coverage fixture appears once in the matrix.
3. Confirm both skill bundles still describe the same repo contract.
4. Confirm the license pack still contains the project notice and the PolyForm URL.
5. Run `npm run check`, `npm test`, `npm run build`, and a package smoke command before publishing implementation changes.
