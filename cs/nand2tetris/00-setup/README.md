# 00 — Setup

## Install the official software suite

1. Download from https://www.nand2tetris.org/software (requires Java).
2. Unzip OUTSIDE this repo (e.g. `~/tools/nand2tetris/`). The suite is ~50MB of Java jars — never commit it.
3. Sanity check: run `tools/HardwareSimulator.sh` (macOS/Linux) or `tools/HardwareSimulator.bat` (Windows) and load a chip.

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
