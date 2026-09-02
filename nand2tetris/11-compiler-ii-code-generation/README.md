# 11 — Compiler II: Code Generation

**Goal:** extend the analyzer into a full Jack compiler: symbol tables + semantic analysis + VM code emission.

## Deliverable

`JackCompiler` translating `.jack` → `.vm` files that run correctly in the VM emulator (the classic "Square" and "Pong" acceptance programs).

## Theory

- **Symbol tables as scopes**: class-level, subroutine-level; kind/type/index triples. Name resolution = table lookup discipline.
- **Objects on the heap**: `this` is a pointer; field access is `*(this + offset)`. Method dispatch passes `this` as `argument 0`. You now know what C++/Java object models are made of.
- **Code generation patterns**: expressions → postorder VM ops; `if`/`while` → labeled gotos; constructors allocate via `Memory.alloc`. 🔒 COMPILE-TIME insight: the compiler's correctness contract is only as strong as the VM's — the layering from project 07 is what makes project 11 tractable.

## Notes

- _status:_ not started
