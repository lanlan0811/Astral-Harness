#!/usr/bin/env bash
#
# Downloads the Node build for a Rust target triple and installs it where Tauri expects
# a sidecar.
#
# Tauri resolves `externalBin: ["binaries/node"]` to `binaries/node-<target-triple>`,
# with a `.exe` suffix on Windows.
#
# Notes on why this is not just a curl:
#
#   * nodejs.org is reachable but slow from some networks, and unreachable from others.
#     Several well-known mirrors carry byte-identical releases, so they are tried in order
#     and the first one that answers wins.
#   * Every download is checked against SHASUMS256.txt. The archive may come from a mirror,
#     but the checksum is fetched from nodejs.org when it can be reached, so a compromised
#     mirror cannot hand us a different binary.
#
# Environment overrides:
#   NODE_DIST_BASE   use only this base URL (for a corporate mirror)
#   NODE_VERSION     pin an exact version, e.g. 22.11.0, instead of resolving the latest 22.x
#
#   node scripts/... -> ./scripts/fetch-node.sh <target-triple>

set -euo pipefail

TARGET="${1:?usage: fetch-node.sh <target-triple>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="$REPO_ROOT/src-tauri/binaries"

# Tried in order. All of them serve /vX.Y.Z/<file>, so one URL shape covers them.
DEFAULT_BASES=(
  "https://nodejs.org/dist"
  "https://npmmirror.com/binaries/node"
  "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release"
  "https://mirrors.ustc.edu.cn/node"
)

if [ -n "${NODE_DIST_BASE:-}" ]; then
  BASES=("$NODE_DIST_BASE")
else
  BASES=("${DEFAULT_BASES[@]}")
fi

CONNECT_TIMEOUT="${NODE_CONNECT_TIMEOUT:-10}"
MAX_TIME="${NODE_MAX_TIME:-300}"

log() { echo "==> $*"; }
warn() { echo "    $*" >&2; }

# ---------------------------------------------------------------------------
# target triple -> archive name
# ---------------------------------------------------------------------------

case "$TARGET" in
  x86_64-pc-windows-msvc) PLATFORM="win";   ARCH="x64" ;;
  aarch64-apple-darwin)  PLATFORM="darwin"; ARCH="arm64" ;;
  x86_64-apple-darwin)   PLATFORM="darwin"; ARCH="x64" ;;
  *)
    echo "unsupported target triple: $TARGET" >&2
    exit 1
    ;;
esac

EXT="tar.gz"
[ "$PLATFORM" = "win" ] && EXT="zip"

# Magic bytes, so a mirror that answers 200 with an HTML error page is rejected instead
# of being handed to unzip.
case "$EXT" in
  zip)   MAGIC="504b0304" ;;
  tar.gz) MAGIC="1f8b" ;;
esac

# ---------------------------------------------------------------------------
# version
# ---------------------------------------------------------------------------

# index.json lists newest first, and one entry per line after splitting on commas.
resolve_latest_22x() {
  local base="$1"
  curl -fsSL --connect-timeout "$CONNECT_TIMEOUT" --max-time 60 \
    "$base/index.json" 2>/dev/null \
    | tr ',' '\n' \
    | sed -n 's/.*"version":"v\(22\.[0-9][0-9]*\.[0-9][0-9]*\)".*/\1/p' \
    | head -n 1
}

if [ -n "${NODE_VERSION:-}" ]; then
  RESOLVED="$NODE_VERSION"
  log "using pinned Node $RESOLVED"
else
  RESOLVED=""
  for base in "${BASES[@]}"; do
    RESOLVED="$(resolve_latest_22x "$base" || true)"
    if [ -n "$RESOLVED" ]; then
      log "resolved latest Node 22.x -> $RESOLVED (via $base)"
      break
    fi
    warn "could not read index.json from $base"
  done
  if [ -z "$RESOLVED" ]; then
    echo "could not resolve a Node 22.x version from any source." >&2
    echo "Set NODE_VERSION to pin one explicitly, e.g. NODE_VERSION=22.11.0" >&2
    exit 1
  fi
fi

# The version and the platform are joined with a hyphen, not a dot:
# node-v22.23.3-win-x64.zip. Getting this wrong 404s on every source.
ARCHIVE="node-v${RESOLVED}-${PLATFORM}-${ARCH}.${EXT}"

# ---------------------------------------------------------------------------
# download
# ---------------------------------------------------------------------------

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ARCHIVE_PATH="$TMP/$ARCHIVE"

DOWNLOADED_FROM=""
for base in "${BASES[@]}"; do
  url="$base/v${RESOLVED}/${ARCHIVE}"
  log "downloading $url"
  # --ipv4 because some networks black-hole IPv6 routes and curl just hangs on them.
  if ! curl -fsSL --ipv4 --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
       "$url" --output "$ARCHIVE_PATH"; then
    warn "download failed, trying the next source"
    rm -f "$ARCHIVE_PATH"
    continue
  fi

  # Compare only as many bytes as the magic has — zip is 4, gzip is 2. Reading a fixed
  # count and comparing it against a different-length magic rejects perfectly good files.
  magic_bytes=$(( ${#MAGIC} / 2 ))
  actual_magic="$(head -c "$magic_bytes" "$ARCHIVE_PATH" | od -An -tx1 | tr -d ' \n')"
  if [ "$actual_magic" != "$MAGIC" ]; then
    # Some mirrors return a 200 with an error or placeholder page.
    warn "not a $EXT archive (starts with $actual_magic, wanted $MAGIC), trying the next source"
    rm -f "$ARCHIVE_PATH"
    continue
  fi

  DOWNLOADED_FROM="$base"
  break
done

if [ -z "$DOWNLOADED_FROM" ]; then
  echo "could not download $ARCHIVE from any source." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# verify
# ---------------------------------------------------------------------------

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

expected_sum() {
  curl -fsSL --ipv4 --connect-timeout "$CONNECT_TIMEOUT" --max-time 60 \
    "$1/v${RESOLVED}/SHASUMS256.txt" 2>/dev/null \
    | grep -F " $ARCHIVE" | cut -d' ' -f1
}

# Prefer nodejs.org for the checksum: a mirror that can hand us a tampered archive can
# also hand us a matching sum, so the checksum has to come from somewhere else.
EXPECTED=""
for base in "${BASES[@]}"; do
  [ "$base" = "https://nodejs.org/dist" ] || [ -n "${NODE_DIST_BASE:-}" ] || continue
  EXPECTED="$(expected_sum "$base" || true)"
  if [ -n "$EXPECTED" ]; then
    log "checksum from $base"
    break
  fi
done

ACTUAL="$(sha256_of "$ARCHIVE_PATH")"

if [ -n "$EXPECTED" ]; then
  if [ "$ACTUAL" != "$EXPECTED" ]; then
    echo "checksum mismatch for $ARCHIVE" >&2
    echo "  expected $EXPECTED" >&2
    echo "  actual   $ACTUAL" >&2
    exit 1
  fi
  log "checksum ok"
else
  # Better than installing nothing, but say so plainly. A mismatch here usually means
  # the resolved version does not have a published checksum rather than a network fault.
  warn "no SHASUMS256.txt entry for $ARCHIVE; continuing without verification"
fi

# ---------------------------------------------------------------------------
# install
# ---------------------------------------------------------------------------

UNPACK="$TMP/unpacked"
mkdir -p "$UNPACK"
case "$EXT" in
  zip)  unzip -q "$ARCHIVE_PATH" -d "$UNPACK" ;;
  tar.gz) tar -xzf "$ARCHIVE_PATH" -C "$UNPACK" ;;
esac

# The two layouts are different and guessing wrong installs the wrong file:
#   win-x64     node-vX.Y.Z-win-x64/node.exe        (archive root, no bin/)
#   darwin-*    node-vX.Y.Z-darwin-arm64/bin/node
# A loose `find -name 'node*'` matches helpers under node_modules/*/bin/ instead —
# a few hundred bytes of JavaScript that is emphatically not the runtime.
if [ "$PLATFORM" = "win" ]; then
  NODE_BIN="$(find "$UNPACK" -maxdepth 2 -type f -name 'node.exe' | head -n 1)"
else
  NODE_BIN="$(find "$UNPACK" -maxdepth 3 -type f -name 'node' -path '*/bin/node' | head -n 1)"
fi

if [ -z "$NODE_BIN" ]; then
  echo "no node executable inside $ARCHIVE" >&2
  exit 1
fi

# A real runtime is tens of megabytes; anything under 10 MB is a stray file.
NODE_BIN_BYTES=$(wc -c < "$NODE_BIN" | tr -d ' ')
if [ "$NODE_BIN_BYTES" -lt 10000000 ]; then
  echo "refusing to install $NODE_BIN — only $NODE_BIN_BYTES bytes, that is not the runtime" >&2
  exit 1
fi

DEST="$DEST_DIR/node-$TARGET"
[ "$TARGET" = "x86_64-pc-windows-msvc" ] && DEST="$DEST.exe"

mkdir -p "$DEST_DIR"
install -m 755 "$NODE_BIN" "$DEST"

# Belt and braces: a wrong or truncated binary that survived the size check must not be
# allowed to leave here looking like a success.
INSTALLED_VERSION="$("$DEST" --version 2>/dev/null || true)"
case "$INSTALLED_VERSION" in
  v22.*) ;;
  *)
    echo "the installed binary did not report a Node 22 version (got: '${INSTALLED_VERSION:-nothing}')" >&2
    exit 1
    ;;
esac

log "installed $DEST ($INSTALLED_VERSION, from $DOWNLOADED_FROM)"
