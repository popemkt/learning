# 01 — Nand Gates (Boolean Logic)

**Goal:** build every boolean chip in the Hack platform from nothing but the primitive `Nand` gate.

## Chips

`Not`, `And`, `Or`, `Xor`, `Mux`, `DMux` (1-bit) → `Not16`, `And16`, `Or16`, `Mux16` (16-bit buses) → `Or8Way`, `Mux4Way16`, `Mux8Way16`, `DMux4Way`, `DMux8Way` (n-way selectors).

## Theory

- **Functional completeness**: `{Nand}` alone can express every boolean function. Every And is `Not(Nand(a,b))`; everything else composes from there.
- **Canonical representation**: any boolean function = sum of minterms. Explains why *some* implementation always exists; elegance is optional.
- **Mux/DMux as control primitives**: Mux = "choose one of many inputs", DMux = "route one input to one of many outputs". These reappear everywhere (ALU op select, memory addressing, VM dispatch).

## Deliverable

15 `.hdl` chips in `01/`, all green in Hardware Simulator. Chapter 1: https://www.nand2tetris.org/book

## Notes

- _status:_ not started
