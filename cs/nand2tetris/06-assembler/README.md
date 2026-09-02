# 06 — Assembler

**Goal:** first software project — translate Hack assembly to binary by hand, no compiler theory needed yet.

## Deliverable

An assembler (any language; suggest Python or TypeScript in `src/`) that converts `.asm` → `.hack`, passing the official test scripts.

## Theory

- **Two-pass assembly**: pass 1 collects label (`@LOOP`) addresses; pass 2 resolves symbols. The canonical fix for forward references — reappears in linkers and compilers.
- **Symbol tables**: predefined symbols (R0–R15, SCREEN, KBD, SP...) + labels + variables (first unseen variable allocates from RAM 16 upward).
- **Translation is mechanical**: A-instructions → `0xxxxxxxxxxxxxxx`; C-instructions → `111accccccdddjjj` from a fixed bit table. 🔒 COMPILE-TIME insight: the C-instruction's 13 control bits ARE the CPU's control plane from project 05 — the assembler just exposes it as text.

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-06-assembler.pdf` ([source](https://drive.google.com/open?id=1uKGRMnL-gqk9DsgeN50z0EpHoSMWe6F5))
- Spec: `~/tools/nand2tetris/docs/project-06-assembler.pdf` ([source](https://drive.google.com/open?id=1CITliwTJzq19ibBF5EeuNBZ3MJ01dKoI))
- Book: chapter 6 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 1](https://www.coursera.org/learn/build-a-computer) — module matches project number
- Beyond: Stuck >30min: search the [official Q&A forum](http://nand2tetris-questions-and-answers-forum.52.s1.nabble.com/) — assembler is the most-asked project

## Notes

- _status:_ not started
