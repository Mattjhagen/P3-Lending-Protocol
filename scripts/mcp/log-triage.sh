#!/usr/bin/env bash
set -euo pipefail

ORG="${SENTRY_ORG:-your-org}"
PROJECT="${SENTRY_PROJECT:-your-project}"
ENVIRONMENT="prod"
TIME_RANGE="24h"
LIMIT="20"
QUERY="is:unresolved"
APPLY_MODE="0"
OUTPUT_ROOT="ops/log-triage"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org)
      ORG="$2"
      shift 2
      ;;
    --project)
      PROJECT="$2"
      shift 2
      ;;
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --time-range)
      TIME_RANGE="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --query)
      QUERY="$2"
      shift 2
      ;;
    --output-root)
      OUTPUT_ROOT="$2"
      shift 2
      ;;
    --apply)
      APPLY_MODE="1"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${SENTRY_AUTH_TOKEN:-}" ]]; then
  echo "Missing SENTRY_AUTH_TOKEN. Set a read-only token with project:read/event:read."
  exit 1
fi

SENTRY_API="${SENTRY_API:-${CODEX_HOME:-$HOME/.codex}/skills/sentry/scripts/sentry_api.py}"
if [[ ! -f "$SENTRY_API" ]]; then
  echo "Sentry helper script not found at: $SENTRY_API"
  exit 1
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$OUTPUT_ROOT/$TS"
mkdir -p "$RUN_DIR"

ISSUES_JSON="$RUN_DIR/issues.json"
SUMMARY_MD="$RUN_DIR/summary.md"
FIX_PROMPT_MD="$RUN_DIR/fix-prompt.md"

python3 "$SENTRY_API" \
  --org "$ORG" \
  --project "$PROJECT" \
  list-issues \
  --environment "$ENVIRONMENT" \
  --time-range "$TIME_RANGE" \
  --query "$QUERY" \
  --limit "$LIMIT" > "$ISSUES_JSON"

python3 - <<'PY' "$ISSUES_JSON" "$SUMMARY_MD" "$ORG" "$PROJECT" "$ENVIRONMENT" "$TIME_RANGE" "$QUERY"
import json
import pathlib
import sys

issues_path = pathlib.Path(sys.argv[1])
summary_path = pathlib.Path(sys.argv[2])
org = sys.argv[3]
project = sys.argv[4]
environment = sys.argv[5]
time_range = sys.argv[6]
query = sys.argv[7]

issues = json.loads(issues_path.read_text())

lines = []
lines.append("# Log Triage Summary")
lines.append("")
lines.append(f"- org: `{org}`")
lines.append(f"- project: `{project}`")
lines.append(f"- environment: `{environment}`")
lines.append(f"- time-range: `{time_range}`")
lines.append(f"- query: `{query}`")
lines.append(f"- issues-found: `{len(issues)}`")
lines.append("")

if not issues:
    lines.append("No issues found for the selected filters.")
else:
    lines.append("| short_id | status | title | count | last_seen |")
    lines.append("| --- | --- | --- | ---: | --- |")
    for issue in issues:
        short_id = issue.get("shortId", "")
        status = issue.get("status", "")
        title = (issue.get("title") or "").replace("|", "/")
        count = issue.get("count", "0")
        last_seen = issue.get("lastSeen", "")
        lines.append(f"| {short_id} | {status} | {title} | {count} | {last_seen} |")

summary_path.write_text("\n".join(lines) + "\n")
PY

cat > "$FIX_PROMPT_MD" <<EOF
# Codex Fix Prompt (Generated)

Use this prompt in a Codex run after reviewing \`summary.md\`.

## Objective
Investigate the highest-impact Sentry issues from \`$ISSUES_JSON\`, then implement the smallest safe fixes.

## Guardrails
1. Do not push directly to \`main\`; work on a \`codex/logfix-*\` branch.
2. Keep changes minimal and scoped to root-cause paths only.
3. Add or update tests for each fix.
4. If confidence is below 0.8, open a TODO in the report instead of changing behavior.
5. Never modify production secrets or deployment credentials.

## Output
1. Root-cause summary per issue (max 5).
2. Exact files changed and why.
3. Tests run and outcomes.
4. Remaining risks/open questions.
EOF

if [[ "${ALLOW_AUTOFIX:-0}" == "1" || "$APPLY_MODE" == "1" ]]; then
  BRANCH="codex/logfix-$TS"
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$current_branch" == "main" ]]; then
    git checkout -b "$BRANCH"
  else
    git checkout -b "$BRANCH"
  fi
  echo "Created branch: $BRANCH"
else
  echo "Dry-run mode. No branch/code changes were made."
fi

echo "Artifacts written to: $RUN_DIR"
echo " - $ISSUES_JSON"
echo " - $SUMMARY_MD"
echo " - $FIX_PROMPT_MD"
