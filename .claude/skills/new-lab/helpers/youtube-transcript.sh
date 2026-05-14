#!/usr/bin/env bash
# youtube-transcript.sh <youtube-url>
#
# Prints a YouTube video's auto-generated English captions to stdout as plain
# text (no timestamps, no VTT cues). Used by the `new-lab` skill to ground
# research on video-first sources without downloading audio.
#
# Exit codes:
#   0  success — transcript on stdout
#   1  bad usage, network failure, or no captions found
#   2  yt-dlp not installed (caller should fall back to asking the user)
#
# Env vars:
#   INSECURE_TLS=1  pass --no-check-certificates to yt-dlp. Use this only when
#                   you've confirmed the failure is a sandbox MITM cert (the
#                   error mentions SSL/TLS/certificate). Off by default.

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: youtube-transcript.sh <youtube-url>" >&2
  exit 1
fi

url="$1"

if ! command -v yt-dlp >/dev/null 2>&1; then
  echo "yt-dlp not found. Install with: pip install yt-dlp" >&2
  exit 2
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# When INSECURE_TLS=1, skip cert verification — needed when running inside a
# sandbox whose egress proxy MITMs HTTPS with a self-signed CA (e.g. Claude
# Code on the web). Caller opts in explicitly; the default is verify=on.
tls_args=()
if [ "${INSECURE_TLS:-0}" = "1" ]; then
  tls_args+=(--no-check-certificates)
fi

# Pull only auto-generated English subs in VTT format. No video, no audio.
yt-dlp \
  --quiet --no-warnings \
  --skip-download \
  --write-auto-sub --sub-lang en --sub-format vtt \
  "${tls_args[@]}" \
  -o "$tmpdir/%(id)s.%(ext)s" \
  "$url" >&2

vtt="$(find "$tmpdir" -name '*.en.vtt' -print -quit)"
if [ -z "${vtt:-}" ] || [ ! -s "$vtt" ]; then
  echo "no English auto-captions found for: $url" >&2
  exit 1
fi

# Strip WEBVTT header, timestamps, cue settings, and inline tags.
# Collapse adjacent duplicate lines (auto-captions repeat heavily).
awk '
  /^WEBVTT/ { next }
  /^[[:space:]]*$/ { next }
  /-->/ { next }
  /^[0-9]+$/ { next }
  {
    gsub(/<[^>]*>/, "")
    gsub(/&nbsp;/, " ")
    gsub(/&amp;/, "&")
    if ($0 != prev) print
    prev = $0
  }
' "$vtt"
