# 07 — VM I: Stack Arithmetic

**Goal:** define a stack-based virtual machine and write the first half of its translator: arithmetic + memory access, `.vm` → Hack assembly.

## Deliverable

VM translator handling `push/pop` (constant, local, argument, this, that, temp, pointer, static) and the 9 arithmetic/logical ops, passing Projects 07 tests in the VM emulator.

## Theory

- **Why a VM**: one compiler targeting one VM beats N compilers × M machines. This is the architectural idea behind JVM, CLR, and WASM — you build the original argument.
- **Segments are views over memory**: `local`/`argument`/`this`/`that` are base-pointer + offset. `static` maps to Hack's variable space; `constant` is pure (push = just emit the literal).
- **Bootstrap pattern**: every arithmetic op expands to a fixed asm idiom (decrement SP, D=pop, ...). ✅ ATTENTION: generate correct-but-dumb code first; optimization comes never in this course — correctness of the idiom is what compounds into project 08.

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-07-vm-i-stack-arithmetic.pdf` ([source](https://drive.google.com/open?id=1BPmhMLu_4QTcte0I5bK4QBHI8SACnQSt))
- Spec: `~/tools/nand2tetris/docs/project-07-vm-i-stack-arithmetic.pdf` ([source](https://drive.google.com/open?id=1DN5Gpjw6uJZuSvGBdXzwm-SHcBEn0PE-))
- Book: chapter 7 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 2](https://www.coursera.org/learn/nand2tetris2) — software half
- Beyond: The same idea at scale: [JVM stack machine](https://en.wikipedia.org/wiki/Stack_machine) — compare its instruction set to the one you just defined

## Notes

- _status:_ not started
