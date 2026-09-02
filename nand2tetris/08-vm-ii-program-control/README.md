# 08 — VM II: Program Control and Functions

**Goal:** second half of the VM translator: `label/goto/if-goto`, and function calls (`function`, `call`, `return`).

## Deliverable

Complete VM translator passing all project 08 tests (nested calls, recursion, Fibonacci, statics across files).

## Theory

- **Call frames = segments on the stack**: `call` saves caller's frame pointers + return address; `return` restores them and jumps. This IS what a real CPU does in hardware — here you do it with 20 lines of generated asm.
- **Statics are per-file**: each `.vm` file gets its own statics segment — the translator must namespace by filename. ❌ FORBIDDEN: one global statics table; recursion into the same file breaks.
- **Bootstrap**: assembly emits the startup code that sets SP=256 and calls `Sys.init`. The machine now "runs programs" end to end.

## Notes

- _status:_ not started
