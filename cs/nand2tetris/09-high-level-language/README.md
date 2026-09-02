# 09 — High-Level Language (Jack)

**Goal:** learn the target language you'll compile in projects 10–11 by writing a real program in it.

## Deliverable

A small Jack application (games are the classic choice — Pong, Snake, Tetris lite) that runs in the VM emulator.

## Theory

- **Jack = minimal OOP**: classes, methods, functions, constructors, static/field/local/argument vars, no inheritance, no exceptions, no floats. Every omitted feature is a decision you'll implement (or not) in your compiler.
- **The language is the spec for the compiler**: `do`, `let`, `while`, `if`, expressions with precedence — everything you compile in project 11 you first experience as a user here.
- ✅ ATTENTION: note every place you hit a missing language feature (arrays are objects, strings are class instances, no `else if`). That list is your compiler's requirements doc.

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-09-high-level-language.pdf` ([source](https://drive.google.com/open?id=1CAGF8d3pDIOgqX8NZGzU34PPEzvfTYrk))
- Spec: `~/tools/nand2tetris/docs/project-09-high-level-language.pdf` ([source](https://drive.google.com/open?id=1O0lZ3oXHhcMrKJJ_byCfz-6Wjgtf7n6q))
- Book: chapter 9 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 2](https://www.coursera.org/learn/nand2tetris2) — software half
- Beyond: Port your game to the [web IDE](https://nand2tetris.github.io/web-ide/) and share it — the compiler projects will then have a real test target

## Notes

- _status:_ not started
