#!/usr/bin/env bash
set -euo pipefail

INIT_PAYLOAD='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"p3-mcp-health","version":"1.0.0"}}}'

print_row() {
  printf "%-32s %-10s %s\n" "$1" "$2" "$3"
}

probe_http_mcp() {
  local name="$1"
  local url="$2"
  local token_var="$3"
  local token="${!token_var:-}"

  if [[ -z "$token" ]]; then
    print_row "$name" "SKIP" "missing $token_var"
    return 0
  fi

  local code
  code="$(
    curl -sS -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      --data "$INIT_PAYLOAD" \
      "$url" || true
  )"

  if [[ "$code" == "200" || "$code" == "202" ]]; then
    print_row "$name" "OK" "HTTP $code"
  else
    print_row "$name" "FAIL" "HTTP $code"
  fi
}

echo "== Environment Variables =="
print_row "Variable" "Status" "Notes"
print_row "--------" "------" "-----"
for var in GITHUB_MCP_BEARER_TOKEN RENDER_MCP_BEARER_TOKEN SUPABASE_ACCESS_TOKEN NETLIFY_AUTH_TOKEN SENTRY_AUTH_TOKEN; do
  if printenv "$var" >/dev/null; then
    print_row "$var" "SET" ""
  else
    print_row "$var" "MISSING" ""
  fi
done

echo
echo "== Codex MCP Configuration =="
codex_json=""
if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found in PATH; cannot validate MCP registry."
else
  codex_json="$(codex mcp list --json 2>/dev/null || true)"
  if [[ -z "$codex_json" ]]; then
    echo "Unable to read MCP list from codex."
  else
    python3 - <<'PY' "$codex_json"
import json
import sys

data = json.loads(sys.argv[1])
print(f"{'Server':<16} {'Enabled':<8} {'Auth':<14} {'Transport':<12} {'Token Env'}")
print(f"{'-'*16} {'-'*8} {'-'*14} {'-'*12} {'-'*20}")
for item in data:
    name = item.get("name", "")
    enabled = str(item.get("enabled", ""))
    auth = item.get("auth_status", "")
    transport = item.get("transport", {}).get("type", "")
    token_env = item.get("transport", {}).get("bearer_token_env_var") or "-"
    print(f"{name:<16} {enabled:<8} {auth:<14} {transport:<12} {token_env}")
PY
  fi
fi

get_auth_info() {
  local server_name="$1"
  if [[ -z "$codex_json" ]]; then
    echo "unknown|"
    return 0
  fi
  python3 - <<'PY' "$codex_json" "$server_name"
import json
import sys

data = json.loads(sys.argv[1])
name = sys.argv[2]
for item in data:
    if item.get("name") == name:
        auth = item.get("auth_status") or "unknown"
        token_env = item.get("transport", {}).get("bearer_token_env_var") or ""
        print(f"{auth}|{token_env}")
        break
else:
    print("unknown|")
PY
}

echo
echo "== HTTP MCP Probes =="
print_row "Server" "Status" "Notes"
print_row "------" "------" "-----"

github_info="$(get_auth_info github)"
github_auth="${github_info%%|*}"
github_env="${github_info#*|}"
if [[ "$github_auth" == "o_auth" ]]; then
  print_row "github" "OK" "OAuth configured via codex mcp login"
else
  probe_http_mcp "github" "https://api.githubcopilot.com/mcp/" "${github_env:-GITHUB_MCP_BEARER_TOKEN}"
fi

render_info="$(get_auth_info render)"
render_auth="${render_info%%|*}"
render_env="${render_info#*|}"
if [[ "$render_auth" == "o_auth" ]]; then
  print_row "render" "OK" "OAuth configured via codex mcp login"
else
  probe_http_mcp "render" "https://mcp.render.com/mcp" "${render_env:-RENDER_MCP_BEARER_TOKEN}"
fi

supabase_info="$(get_auth_info supabase)"
supabase_auth="${supabase_info%%|*}"
supabase_env="${supabase_info#*|}"
if [[ "$supabase_auth" == "o_auth" ]]; then
  print_row "supabase" "OK" "OAuth configured via codex mcp login"
else
  probe_http_mcp "supabase" "https://mcp.supabase.com/mcp" "${supabase_env:-SUPABASE_ACCESS_TOKEN}"
fi

if npx -y netlify api listSites --data '{"page":1,"per_page":1}' >/dev/null 2>&1; then
  print_row "netlify" "OK" "Netlify CLI/API auth valid"
else
  print_row "netlify" "FAIL" "Netlify CLI/API auth unavailable"
fi

echo
echo "Done."
