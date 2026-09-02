# 12 — Operating System

**Goal:** write the Jack OS — the class library everything above silently depended on.

## Deliverable

The 8 OS classes in Jack: `Math`, `Memory`, `Array`, `String`, `Screen`, `Output`, `Keyboard`, `Sys` — passing official tests in the VM emulator.

## Theory

- **The OS is just code with a fast path**: `Memory.alloc` is a free-list allocator; `Math.multiply` is shift-and-add loops on 16-bit words; `Math.sqrt` is Newtonian iteration on integers. No magic — algorithms you already know, at bit level.
- **Device access via memory maps**: `Screen.drawPixel` computes an address in the screen segment and sets bits. ✅ ATTENTION: this is the last stop of the whole course — pixels on screen trace back through compiler → VM → assembler → ALU → Nand.
- **Why projects 7–11 kept calling `Sys.init`**: this project is where `Sys` finally exists. Bootstrap chains all the way down (and up).

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-12-operating-system.pdf` ([source](https://drive.google.com/open?id=137PiYjt4CAZ3ROWiD0DJ8XMUbMM0_VHR))
- Spec: `~/tools/nand2tetris/docs/project-12-operating-system.pdf` ([source](https://drive.google.com/open?id=1Qeuor0zqUAR0Q6xGPCuwdfYDAQILjbEm))
- Book: chapter 12 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 2](https://www.coursera.org/learn/nand2tetris2) — software half
- Beyond: Where OS goes next: [OSTEP](https://pages.cs.wisc.edu/~remzi/OSTEP/) (free book) — real virtual memory, processes, concurrency

## Notes

- _status:_ not started
