# 03 — Sequential Logic (Memory)

**Goal:** time enters the picture. Build registers and RAM out of DFFs (given as built-in).

## Chips

`Bit`, `Register`, `RAM8`, `RAM64`, `RAM512`, `RAM4K`, `RAM16K` (hierarchical addressing), `PC` (program counter with load/inc/reset).

## Theory

- **Clock + DFF = state**: the DFF commits its input at the clock edge, breaking the feedback problem. ✅ ATTENTION: sequential chips are evaluated only on clock ticks — combinational bugs and timing bugs look different in the simulator.
- **Memory is address decoding**: RAM8→RAM64→... is just repeated mux-out / demux-in trees. Understand why 1M bits of RAM costs O(n log n)-ish gates, not O(n²).
- **PC**: a register + incrementer + reset. This one chip is what makes "programs run in order" possible at the hardware level.

## Deliverable

Full Hack memory hierarchy + PC, all official tests green.

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-03-memory.pdf` ([source](https://drive.google.com/open?id=1boFooygPrxMX-AxzogFYIZ-8QsZiDz96))
- Spec: `~/tools/nand2tetris/docs/project-03-memory.pdf` ([source](https://drive.google.com/open?id=1ArUW8mkh4Kax-2TXGRpjPWuHf70u6_TJ))
- Book: chapter 3 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 1](https://www.coursera.org/learn/build-a-computer) — module matches project number
- Beyond: Ben Eater on registers and RAM: https://eater.net/8bit/registers and https://eater.net/8bit/ram

## Notes

- _status:_ not started
