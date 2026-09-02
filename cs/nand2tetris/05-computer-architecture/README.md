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

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-05-computer-architecture.pdf` ([source](https://drive.google.com/open?id=1Z_fxYmmRNXTkAzmZ6YMoX9NXZIRVCKiw))
- Spec: `~/tools/nand2tetris/docs/project-05-computer-architecture.pdf` ([source](https://drive.google.com/open?id=1CJ1ymH6xdC5Z-Da8G0tqowaoOXq1cdbU))
- Book: chapter 5 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 1](https://www.coursera.org/learn/build-a-computer) — module matches project number
- Beyond: Next level up: [CS:APP](https://csapp.cs.cmu.edu) (ch. 4) and Berkeley [CS61C](https://cs61c.org) lectures

## Notes

- _status:_ not started
