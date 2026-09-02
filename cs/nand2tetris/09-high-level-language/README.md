# 09 — High-Level Language (Jack)

**Goal:** learn the target language you'll compile in projects 10–11 by writing a real program in it.

## Deliverable

A small Jack application (games are the classic choice — Pong, Snake, Tetris lite) that runs in the VM emulator.

## Theory

- **Jack = minimal OOP**: classes, methods, functions, constructors, static/field/local/argument vars, no inheritance, no exceptions, no floats. Every omitted feature is a decision you'll implement (or not) in your compiler.
- **The language is the spec for the compiler**: `do`, `let`, `while`, `if`, expressions with precedence — everything you compile in project 11 you first experience as a user here.
- ✅ ATTENTION: note every place you hit a missing language feature (arrays are objects, strings are class instances, no `else if`). That list is your compiler's requirements doc.

## Notes

- _status:_ not started
