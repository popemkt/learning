# 04 — Machine Language (Hack Assembly)

**Goal:** learn the Hack machine language by hand — write and run programs in the CPU emulator before building the machine that runs them.

## Programs

`Mult` (multiply via repeated addition, R0×R1→R2), `Fill` (listen to keyboard, paint the screen black/white).

## Theory

- **ISA as a contract**: Hack assembly is `@addr` (A-instruction: load address/constant into A) + `dest=comp;jump` (C-instruction). The tiny ISA is deliberately minimal — the book shows how much you can build on ~15 instruction forms.
- **Memory-mapped I/O**: the screen is 8K words at 16384, keyboard is one word at 24576. ✅ ATTENTION: `Fill` works by writing to memory addresses, no special I/O instructions exist.
- **The stack is not in the ISA**: Hack hardware has no stack pointer. Projects 7–8 will build one in software — remember this pain later.

## Deliverable

Both `.asm` programs pass in the CPU emulator.

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-04-machine-language.pdf` ([source](https://drive.google.com/open?id=1HxjPmIZkFHl-BVW3qoz8eD9dqEuEyuBI))
- Spec: `~/tools/nand2tetris/docs/project-04-machine-language.pdf` ([source](https://drive.google.com/open?id=1orGwC3o74vGv_rk-FDwoJGVvTxWGuQOC))
- Book: chapter 4 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 1](https://www.coursera.org/learn/build-a-computer) — module matches project number
- Beyond: Hand-assemble the same programs with the [web IDE](https://nand2tetris.github.io/web-ide/) when away from the desktop tools

## Notes

- _status:_ not started
