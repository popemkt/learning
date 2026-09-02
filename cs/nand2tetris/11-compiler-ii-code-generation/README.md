# 11 — Compiler II: Code Generation

**Goal:** extend the analyzer into a full Jack compiler: symbol tables + semantic analysis + VM code emission.

## Deliverable

`JackCompiler` translating `.jack` → `.vm` files that run correctly in the VM emulator (the classic "Square" and "Pong" acceptance programs).

## Theory

- **Symbol tables as scopes**: class-level, subroutine-level; kind/type/index triples. Name resolution = table lookup discipline.
- **Objects on the heap**: `this` is a pointer; field access is `*(this + offset)`. Method dispatch passes `this` as `argument 0`. You now know what C++/Java object models are made of.
- **Code generation patterns**: expressions → postorder VM ops; `if`/`while` → labeled gotos; constructors allocate via `Memory.alloc`. 🔒 COMPILE-TIME insight: the compiler's correctness contract is only as strong as the VM's — the layering from project 07 is what makes project 11 tractable.

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-11-compiler-ii-code-generation.pdf` ([source](https://drive.google.com/open?id=1CYOcXKxfAwRHaOERvoyuNKSwdlxMo_e3))
- Spec: `~/tools/nand2tetris/docs/project-11-compiler-ii-code-generation.pdf` ([source](https://drive.google.com/open?id=1O-129lGOVNQ8XU7J4z0SGgbp7gPUv0sj))
- Book: chapter 11 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 2](https://www.coursera.org/learn/nand2tetris2) — software half
- Beyond: The modern follow-up: [Crafting Interpreters](https://craftinginterpreters.com) (free book) — build a bytecode VM in ~2000 lines

## Notes

- _status:_ not started
