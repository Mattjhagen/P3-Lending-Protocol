# MCP Automation Runbook (Logs -> Safe Fixes)

This runbook sets up a controlled loop for:
1. Reading production issues/logs.
2. Summarizing top failures.
3. Applying minimal fixes on a non-main branch.

## 1) Architecture Layers

### Layer A: Signal Ingestion (Read-Only)
- Sentry issues/events via `SENTRY_AUTH_TOKEN` (read-only scopes).
- Optional platform MCP servers: GitHub, Render, Supabase, Netlify.

### Layer B: Triage + Prioritization
- Run `scripts/mcp/log-triage.sh` to snapshot top unresolved issues.
- Generate:
  - `issues.json` (machine-readable input)
  - `summary.md` (human review)
  - `fix-prompt.md` (Codex execution prompt)

### Layer C: Guarded Change Execution
- Never patch directly on `main`.
- Use `codex/logfix-*` branch naming.
- Require tests per fix.
- Promote via PR review.

## 2) Permission Model

| Capability | Token / Auth | Minimum Permission | Default Mode |
| --- | --- | --- | --- |
| Read Sentry issues | `SENTRY_AUTH_TOKEN` | `project:read`, `event:read`, `org:read` | Enabled |
| Read GitHub MCP context | `GITHUB_MCP_BEARER_TOKEN` | Repo read/write as needed | Enabled |
| Read Render service state | `RENDER_MCP_BEARER_TOKEN` | Service read | Enabled |
| Read Supabase MCP | `SUPABASE_ACCESS_TOKEN` | Project read | Optional |
| Code changes | Git local branch | Branch-only writes | Disabled unless explicitly enabled |
| Push changes | Git remote | Non-main branch push | Manual |

## 3) Setup Steps

1. Configure MCP servers in `/Users/matt/.codex/config.toml` with env-var auth names only.
2. Export required env vars in your shell profile (do not hardcode tokens in repo files).
3. Validate connectivity:

```bash
npm run mcp:health
```

4. Run log triage:

```bash
npm run logs:triage -- --org <sentry-org> --project <sentry-project>
```

5. Optional guarded branch creation:

```bash
npm run logs:triage:apply -- --org <sentry-org> --project <sentry-project>
```

## 4) Operational Workflow

1. Run triage and inspect `ops/log-triage/<timestamp>/summary.md`.
2. Review `fix-prompt.md`, then execute a Codex fix pass.
3. Run test suite for touched areas.
4. Commit to `codex/logfix-*`.
5. Open PR to `main`.

## 5) Safety Rules

1. Do not store API keys/tokens in source-controlled files.
2. Keep production and development credentials separated.
3. Restrict auto-fix to narrow scopes and small diffs.
4. Require human approval before merging.
5. Rotate tokens immediately if leaked.
