#!/usr/bin/env bash
set -euo pipefail

WORKDIR="${1:-$(pwd)}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$WORKDIR/ops/auto-remediate/$TIMESTAMP"
mkdir -p "$RUN_DIR"

HEALTH_LOG="$RUN_DIR/mcp-health.log"
PROMPT_FILE="$RUN_DIR/prompt.md"
RESULT_LOG="$RUN_DIR/codex-result.log"

echo "== MCP Health =="
(cd "$WORKDIR" && npm run mcp:health) | tee "$HEALTH_LOG"

if rg -n "FAIL" "$HEALTH_LOG" >/dev/null 2>&1; then
  echo "MCP health has failures. Skipping auto-remediation."
  exit 1
fi

cat > "$PROMPT_FILE" <<'EOF'
Use connected MCP servers (render, github, netlify, supabase) to investigate incidents in the last 60 minutes.

Execution requirements:
1. If no actionable incidents exist, return a short "no findings" report.
2. If incidents exist, identify top 3 root causes and fix only the smallest high-confidence issues.
3. Create a branch named codex/auto-fix-<timestamp>.
4. Implement code fixes with tests.
5. Run the minimal relevant test commands.
6. Commit and push branch to origin.
7. Return a deployment-safe summary with rollback notes.

Safety constraints:
1. Never push directly to main.
2. Never edit secrets or credential files.
3. Skip risky migrations unless explicitly required by the incident and fully validated.
EOF

echo "== Codex Auto-Remediation =="
(
  cd "$WORKDIR"
  codex exec \
    --sandbox workspace-write \
    --ask-for-approval never \
    --cd "$WORKDIR" \
    "$(cat "$PROMPT_FILE")"
) | tee "$RESULT_LOG"

echo "Auto-remediation artifacts:"
echo " - $HEALTH_LOG"
echo " - $PROMPT_FILE"
echo " - $RESULT_LOG"
