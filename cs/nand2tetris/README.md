# nand2tetris

Ground-up relearning track: build a general-purpose computer from a single Nand gate, then build the software stack on top of it — assembler, VM, compiler, OS.

Source: https://www.nand2tetris.org (Nisan & Schocken, *The Elements of Computing Systems*, 2nd ed.)

## Structure

One folder per project, in order:

| # | Folder | Layer | You build |
|---|--------|-------|-----------|
| 00 | [00-setup](00-setup/README.md) | — | Toolchain installed locally |
| 01 | [01-nand-gates](01-nand-gates/README.md) | Hardware | 15 boolean logic chips |
| 02 | [02-boolean-arithmetic](02-boolean-arithmetic/README.md) | Hardware | Adder + ALU |
| 03 | [03-sequential-logic](03-sequential-logic/README.md) | Hardware | Registers, RAM, PC |
| 04 | [04-machine-language](04-machine-language/README.md) | Hardware | Hack assembly programs |
| 05 | [05-computer-architecture](05-computer-architecture/README.md) | Hardware | CPU + full Hack computer |
| 06 | [06-assembler](06-assembler/README.md) | Software | Hack assembler |
| 07 | [07-vm-i-stack-arithmetic](07-vm-i-stack-arithmetic/README.md) | Software | VM translator (arithmetic/memory) |
| 08 | [08-vm-ii-program-control](08-vm-ii-program-control/README.md) | Software | VM translator (functions/control) |
| 09 | [09-high-level-language](09-high-level-language/README.md) | Software | Jack application |
| 10 | [10-compiler-i-syntax-analysis](10-compiler-i-syntax-analysis/README.md) | Software | Jack tokenizer + parser |
| 11 | [11-compiler-ii-code-generation](11-compiler-ii-code-generation/README.md) | Software | Jack compiler backend |
| 12 | [12-operating-system](12-operating-system/README.md) | Software | Jack OS class library |

## Live resources

- Course home: https://www.nand2tetris.org
- Software suite download (HDL simulator, CPU emulator, VM emulator, Jack tools): https://www.nand2tetris.org/software
- Free book chapters + projects: https://www.nand2tetris.org/book
- Course info / lecture slides: https://www.nand2tetris.org/course
- Coursera part 1 (hardware): https://www.coursera.org/learn/build-a-computer
- Coursera part 2 (software): https://www.coursera.org/learn/nand2tetris2
- Official Q&A forum: http://nand2tetris-questions-and-answers-forum.52.s1.nabble.com/

## Conventions

- Official toolchain: write `.hdl` / `.asm` / `.jack` files exactly per spec; test with the official `.tst` scripts. Do NOT commit the downloaded tool suite (see [00-setup](00-setup/README.md)).
- Each project folder gets a short notes section: what the official tests verified, what concept clicked, what to revisit.
- Companion primers: [../automata-theory](../automata-theory/README.md), [../category-theory](../category-theory/README.md).
