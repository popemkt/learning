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

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-01-boolean-logic.pdf` ([source](https://drive.google.com/open?id=1MY1buFHo_Wx5DPrKhCNSA2cm5ltwFJzM))
- Spec: `~/tools/nand2tetris/docs/project-01-boolean-logic.pdf` ([source](https://drive.google.com/open?id=17Rt3z7_OvpoQNlM6xtmC67Rn3blgM4W5))
- Book: chapter 1 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 1](https://www.coursera.org/learn/build-a-computer) — module matches project number
- Beyond: Play [NandGame](https://www.nandgame.com) — the same gates as puzzles; watch gates turn into a computer on breadboards: [Ben Eater's 8-bit series](https://eater.net/8bit)

## Notes

- _status:_ not started
