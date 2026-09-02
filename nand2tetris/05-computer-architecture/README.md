# 05 — Computer Architecture

**Goal:** assemble the Hack computer: CPU chip + memory + screen/keyboard, running project 04's machine language. End of the hardware half.

## Chips

`Memory` (RAM16K + screen map + keyboard), `CPU` (the real one: ALU + registers + control decoding), `Computer`.

## Theory

- **Fetch–decode–execute cycle**: the PC feeds ROM address → instruction → control bits → ALU/registers/next-PC. Every CPU you'll ever read about is a decorated version of this loop.
- **C-instruction bits are the control plane**: the 16-bit instruction literally encodes ALU ops, destination registers, and jump conditions. ❌ FORBIDDEN: thinking of "instructions" and "circuits" as separate worlds — project 05 is where they unify.
- **Von Neumann bottleneck, observed**: data and instructions share the address space; you'll feel the cost when `Mult` shuffles values through R13–R15.

## Deliverable

`Computer.hdl` runs `Mult.hack` and `Fill.hack` to completion.

## Notes

- _status:_ not started
