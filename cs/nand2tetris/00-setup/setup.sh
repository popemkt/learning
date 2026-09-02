#!/usr/bin/env bash
# setup.sh — install the official Nand2Tetris desktop suite (v2.7).
# Rerunnable: skips install if already present; FORCE=1 re-downloads.
# Suite lands OUTSIDE the repo (~/tools/nand2tetris) and stays untracked.
set -euo pipefail

DEST="${N2T_HOME:-$HOME/tools/nand2tetris}"
ZIP="$(mktemp -t n2t-suite-XXXXXX).zip"
# ✅ ATTENTION: this is the official v2.7 desktop suite link (tools/ + projects/0-13)
#    scraped from the install note PDF on nand2tetris.org/software — the page's
#    visible zip is a source-only distro without projects/.
URL="https://drive.usercontent.google.com/download?id=1xZzcMIUETv3u3sdpM_oTJSTetpVee3KZ&export=download&confirm=t"

if [[ -x "$DEST/tools/TextComparer.sh" && "${FORCE:-0}" != 1 ]]; then
  echo "already installed at $DEST — set FORCE=1 to reinstall"
else
  echo "downloading suite 2.7 ..."
  curl -fSL --retry 3 "$URL" -o "$ZIP"
  rm -rf "$DEST"                       # ⚠️ CRITICAL: clean cutover, no stale classes
  unzip -q "$ZIP" -d "$(dirname "$DEST")"
  rm -rf __MACOSX "$(dirname "$DEST")/__MACOSX" 2>/dev/null || true
  find "$DEST" -name '.DS_Store' -delete
fi

# zip strips exec bits — restore launchers
chmod +x "$DEST"/tools/*.sh

# 🔒 COMPILE-TIME check: TextComparer is headless — proves the jars run
#    under whatever `java` is on PATH before you open any GUI.
"$DEST/tools/TextComparer.sh" "$DEST/projects/1/And.cmp" "$DEST/projects/1/And.cmp" | tail -1

echo "done: $DEST"
echo "start:  $DEST/tools/HardwareSimulator.sh $DEST/projects/1/And.tst"
