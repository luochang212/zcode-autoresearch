#!/bin/sh
# Locates a Node >= 24 executable and execs it with the passed arguments.
#
# ZCode spawns MCP servers and hooks with the app's own PATH, which often
# misses user-managed Node installs (nvm, Homebrew, ...): a suitable Node can
# exist on the machine while `command: node` still fails to spawn. This
# resolver searches well-known locations before giving up; anet-run.sh
# documents the same trap ("a desktop application does not always inherit the
# PATH of a login shell").
#
# Usage:
#   sh run-node.sh <script.ts> [args...]   exec node with the arguments
#   sh run-node.sh --resolve               print the resolved node, exit 0
#
# AUTORESEARCH_NODE_BIN overrides the search outright: a configured path is
# used as it is and is never replaced by another copy; a missing,
# non-executable or too-old override is a hard error.
#
# stdout belongs to the MCP JSON-RPC channel: probing happens inside command
# substitution, diagnostics go to stderr only, and a successful resolution
# execs (replacing the shell).

set -u

NODE_MIN_MAJOR=24
NODE_HINT="Install Node >= $NODE_MIN_MAJOR, or set AUTORESEARCH_NODE_BIN to a suitable binary."
NODE_SEARCHED="Searched: PATH, nvm (\${NVM_DIR:-\$HOME/.nvm}), /opt/homebrew/bin, /usr/local/bin."

fail() {
  echo "autoresearch run-node: $1" >&2
  exit 127
}

# MAJOR.MINOR.PATCH of a candidate, empty when it does not run
node_version() {
  "$1" -p 'process.versions.node' 2>/dev/null
}

# integer major of "MAJOR.MINOR...", 0 when unparsable
version_major() {
  _v="${1#v}"
  _major="${_v%%.*}"
  case "$_major" in
    '' | *[!0-9]*) printf '0' ;;
    *) printf '%s' "$_major" ;;
  esac
}

# sets NODE_BIN; returns 1 when nothing suitable is found (no output)
choose_node() {
  if [ -n "${AUTORESEARCH_NODE_BIN:-}" ]; then
    [ -x "$AUTORESEARCH_NODE_BIN" ] || fail "AUTORESEARCH_NODE_BIN=$AUTORESEARCH_NODE_BIN is not an executable file"
    _v="$(node_version "$AUTORESEARCH_NODE_BIN")"
    [ "$(version_major "${_v:-}")" -ge "$NODE_MIN_MAJOR" ] ||
      fail "AUTORESEARCH_NODE_BIN=$AUTORESEARCH_NODE_BIN is Node ${_v:-unknown}; Node >= $NODE_MIN_MAJOR is required (native TypeScript execution)"
    NODE_BIN="$AUTORESEARCH_NODE_BIN"
    return 0
  fi

  # PATH first: machines where node already resolves keep today's behavior
  _path_node="$(command -v node 2>/dev/null || true)"
  for _cand in ${_path_node:+"$_path_node"} \
    "${NVM_DIR:-${HOME:-}/.nvm}"/versions/node/*/bin/node \
    /opt/homebrew/bin/node \
    /usr/local/bin/node; do
    if [ ! -f "$_cand" ] || [ ! -x "$_cand" ]; then continue; fi
    _v="$(node_version "$_cand")"
    if [ "$(version_major "${_v:-}")" -lt "$NODE_MIN_MAJOR" ]; then continue; fi
    NODE_BIN="$_cand"
    return 0
  done
  return 1
}

if [ "${1:-}" = "--resolve" ]; then
  choose_node || fail "no Node >= $NODE_MIN_MAJOR found. $NODE_SEARCHED $NODE_HINT"
  printf 'node=%s\nversion=%s\n' "$NODE_BIN" "$(node_version "$NODE_BIN")"
  exit 0
fi

if [ "$#" -lt 1 ]; then
  echo "autoresearch run-node: usage: run-node.sh <script.ts> [args...] | --resolve" >&2
  exit 2
fi

choose_node || fail "no Node >= $NODE_MIN_MAJOR found. $NODE_SEARCHED $NODE_HINT (tried to run: $1)"
exec "$NODE_BIN" "$@"
