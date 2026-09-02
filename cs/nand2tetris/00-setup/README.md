# 00 — Setup

## Install the official software suite

Installed and verified on this machine (2026-09-02):

1. Suite **v2.7** (desktop, official) from the link on https://www.nand2tetris.org/software → `~/tools/nand2tetris/` (contains `tools/` + `projects/0–13`). Never commit it (gitignored).
2. Zip strips exec bits — run `chmod +x ~/tools/nand2tetris/tools/*.sh` once.
3. Verified: `TextComparer.sh` runs headless, `HardwareSimulator.sh` launches under GraalVM CE 25 (Java 25 works; no separate JRE install needed).

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
