# 08 — VM II: Program Control and Functions

**Goal:** second half of the VM translator: `label/goto/if-goto`, and function calls (`function`, `call`, `return`).

## Deliverable

Complete VM translator passing all project 08 tests (nested calls, recursion, Fibonacci, statics across files).

## Theory

- **Call frames = segments on the stack**: `call` saves caller's frame pointers + return address; `return` restores them and jumps. This IS what a real CPU does in hardware — here you do it with 20 lines of generated asm.
- **Statics are per-file**: each `.vm` file gets its own statics segment — the translator must namespace by filename. ❌ FORBIDDEN: one global statics table; recursion into the same file breaks.
- **Bootstrap**: assembly emits the startup code that sets SP=256 and calls `Sys.init`. The machine now "runs programs" end to end.

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-08-vm-ii-program-control.pdf` ([source](https://drive.google.com/open?id=1BexrNmdqYhKPkqD_Y81qNAUeyfzl-ZtO))
- Spec: `~/tools/nand2tetris/docs/project-08-vm-ii-program-control.pdf` ([source](https://drive.google.com/open?id=1F2cYb2cIPFG0B_GybMcnNUPtc5mq8mHY))
- Book: chapter 8 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 2](https://www.coursera.org/learn/nand2tetris2) — software half
- Beyond: What real compilers emit: C calling conventions in [CS:APP](https://csapp.cs.cmu.edu) ch. 3 — same frame logic, done in hardware

## Notes

- _status:_ not started
