# 06 — Assembler

**Goal:** first software project — translate Hack assembly to binary by hand, no compiler theory needed yet.

## Deliverable

An assembler (any language; suggest Python or TypeScript in `src/`) that converts `.asm` → `.hack`, passing the official test scripts.

## Theory

- **Two-pass assembly**: pass 1 collects label (`@LOOP`) addresses; pass 2 resolves symbols. The canonical fix for forward references — reappears in linkers and compilers.
- **Symbol tables**: predefined symbols (R0–R15, SCREEN, KBD, SP...) + labels + variables (first unseen variable allocates from RAM 16 upward).
- **Translation is mechanical**: A-instructions → `0xxxxxxxxxxxxxxx`; C-instructions → `111accccccdddjjj` from a fixed bit table. 🔒 COMPILE-TIME insight: the C-instruction's 13 control bits ARE the CPU's control plane from project 05 — the assembler just exposes it as text.

## Notes

- _status:_ not started
