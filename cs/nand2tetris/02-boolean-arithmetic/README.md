# 02 — Boolean Arithmetic and the ALU

**Goal:** from bits to arithmetic — half/full adders, 16-bit adder, and the Hack ALU.

## Chips

`HalfAdder`, `FullAdder`, `Add16`, `Inc16`, and `ALU` (the specified Hack ALU: zx/nx/zy/ny/f/no control bits, `zr`/`ng` status outputs).

## Theory

- **Two's complement**: negation = flip all bits + 1; subtraction falls out of the same adder. One adder circuit handles signed and unsigned.
- **The ALU as a designed tradeoff**: Hack's ALU is not general — it computes exactly the 18 functions the VM/compiler layer will need. ❌ FORBIDDEN mindset: "design the perfect ALU". Design the minimal ALU that serves the layers above; generality is added in software.
- **Status bits** (`zr`, `ng`) are how the CPU later implements branches — a 2-wire contract between arithmetic and control flow.

## Deliverable

`ALU` passing the official test, built almost entirely from project 1 chips.

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-02-boolean-arithmetic.pdf` ([source](https://drive.google.com/open?id=1ie9s3GjM2TrvL7PrEZJ00gEwezgNLOBm))
- Spec: `~/tools/nand2tetris/docs/project-02-boolean-arithmetic.pdf` ([source](https://drive.google.com/open?id=17SzlbKXl0kc5BHsKsKMrOlx-EEpWvq7g))
- Book: chapter 2 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 1](https://www.coursera.org/learn/build-a-computer) — module matches project number
- Beyond: Ben Eater builds a real ALU on breadboards: https://eater.net/8bit/alu

## Notes

- _status:_ not started
