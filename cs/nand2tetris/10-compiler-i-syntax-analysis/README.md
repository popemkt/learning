# 10 — Compiler I: Syntax Analysis

**Goal:** write a Jack tokenizer + recursive-descent parser that emits XML parse trees matching the official grammar.

## Deliverable

`JackAnalyzer` producing the exact XML the provided `JackTokenizer`/tests expect.

## Theory

- **Grammars define languages**: Jack's grammar is given as LL(k) productions; the parser is a direct transcription of the grammar rules into functions. ✅ ATTENTION: `expression`, `expressionList`, `subroutineCall` are mutually recursive — that's the whole trick and the whole difficulty.
- **Tokenizing vs parsing**: regex-able phase (lexical) vs grammar-driven phase (syntax). Keep them cleanly separate.
- **This is where automata theory pays off** (see [../automata-theory](../automata-theory/README.md)): CFGs, left-recursion, lookahead — the parser you write is a pushdown automaton in code form.

## Materials

- Slides: `~/tools/nand2tetris/docs/lecture-10-compiler-i-syntax-analysis.pdf` ([source](https://drive.google.com/open?id=1CM_w6cxQpYnYHcP-OhNkNU6oD5rMnjzv))
- Spec: `~/tools/nand2tetris/docs/project-10-compiler-i-syntax-analysis.pdf` ([source](https://drive.google.com/open?id=1O1nTS24VM2kp_ilTZCrBZOryhTK1e0qN))
- Book: chapter 10 in `tecs-book.epub` (same folder) — slides alone suffice
- Video: [Coursera part 2](https://www.coursera.org/learn/nand2tetris2) — software half
- Beyond: Play with grammars visually in [JFLAP](https://www.jflap.org); pair with [../automata-theory](../automata-theory/README.md)

## Notes

- _status:_ not started
