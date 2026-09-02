# 12 — Operating System

**Goal:** write the Jack OS — the class library everything above silently depended on.

## Deliverable

The 8 OS classes in Jack: `Math`, `Memory`, `Array`, `String`, `Screen`, `Output`, `Keyboard`, `Sys` — passing official tests in the VM emulator.

## Theory

- **The OS is just code with a fast path**: `Memory.alloc` is a free-list allocator; `Math.multiply` is shift-and-add loops on 16-bit words; `Math.sqrt` is Newtonian iteration on integers. No magic — algorithms you already know, at bit level.
- **Device access via memory maps**: `Screen.drawPixel` computes an address in the screen segment and sets bits. ✅ ATTENTION: this is the last stop of the whole course — pixels on screen trace back through compiler → VM → assembler → ALU → Nand.
- **Why projects 7–11 kept calling `Sys.init`**: this project is where `Sys` finally exists. Bootstrap chains all the way down (and up).

## Notes

- _status:_ not started
