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

## Notes

- _status:_ not started
