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

## Notes

- _status:_ not started
