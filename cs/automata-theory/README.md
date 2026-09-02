# automata-theory

Primer on the theory of computation — the "what is computation" layer underneath nand2tetris (parsers, compilers) and programming languages in general.

## Study order

1. **Regular languages** — DFAs, NFAs, regex equivalence (NFA→DFA subset construction), pumping lemma for non-regularity.
2. **Context-free languages** — CFGs, parse trees, ambiguity, pushdown automata. Direct prerequisite for N2T project 10 (recursive-descent parsing).
3. **Turing machines** — the Church-Turing thesis, decidability, the halting problem, reductions.
4. **Complexity** — P, NP, NP-completeness, reductions (brief primer; not the deep dive).

## Why it pairs with nand2tetris

| N2T project | Automata concept |
|-------------|------------------|
| 06 assembler | regular languages (line-oriented tokenization) |
| 10 compiler I | CFGs, LL parsing, lookahead |
| 11 compiler II | semantic restrictions beyond CFG power |
| VM (07–08) | universal machines — the VM is a UTM with a stack |

## Live resources

- MIT OCW 18.404J Theory of Computation (Sipser's own lectures, full course): https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/
- Hands-on: build automata visually in [JFLAP](https://www.jflap.org), run Turing machines at [turingmachinesimulator.com](https://turingmachinesimulator.com), and build a real regex engine: Russ Cox's classic series ([part 1](https://swtch.com/~rsc/regexp/regexp1.html))
- Complexity beyond the primer: [Complexity Zoo](https://complexityzoo.net/Complexity_Zoo)
- Sipser, *Introduction to the Theory of Computation* (3rd ed.) — the standard text.
- Hopcroft, Motwani, Ullman, *Automata Theory, Languages, and Computation* — more automata-heavy alternative.
- Neso Academy automata playlist (ground-up, gentle): https://www.youtube.com/playlist?list=PLBlnK6fEyqRgp46KUhs-DWa8FBRyUw2xA

## Notes

- _status:_ not started
