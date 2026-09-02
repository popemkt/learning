# 00 — Setup

## Install the official software suite

Rerunnable script (idempotent; `FORCE=1` reinstalls):

```bash
./setup.sh
```

What it does (verified 2026-09-02):

1. Downloads the official desktop suite **v2.7** (link inside the script — the page's visible zip is a source-only distro without `projects/`) → `~/tools/nand2tetris/` (`tools/` + `projects/0–13`). Never committed (gitignored).
2. Restores exec bits the zip strips.
3. Health-checks headless via `TextComparer.sh` — proves the jars run under whatever `java` is on PATH (GraalVM CE 25 verified; no separate JRE needed).

## Tool you use per project

| Projects | Tool |
|----------|------|
| 01–03, 05 | Hardware Simulator (`.hdl` + `.tst`) |
| 04 | CPU emulator (`.hack` via `.asm`) |
| 06 | Assembler (self-written; test with official `.tst`) |
| 07–08 | VM emulator + your own translator |
| 09–12 | Jack compiler/OS tools + VM emulator |

## Notes

- The GUI `.tst` scripts and compare files are the ground truth — a chip is done when the simulator says "End of script - Comparison ended successfully".
- ⚠️ CRITICAL: `.hdl` files must match the exact interface in each project spec (chip name, pin order). The simulator hard-fails otherwise.
- Keep scratch `.out` files gitignored: add `*.out` to `.gitignore` if the suite writes them into project folders.
