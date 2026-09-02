# 10 — Compiler I: Syntax Analysis

**Goal:** write a Jack tokenizer + recursive-descent parser that emits XML parse trees matching the official grammar.

## Deliverable

`JackAnalyzer` producing the exact XML the provided `JackTokenizer`/tests expect.

## Theory

- **Grammars define languages**: Jack's grammar is given as LL(k) productions; the parser is a direct transcription of the grammar rules into functions. ✅ ATTENTION: `expression`, `expressionList`, `subroutineCall` are mutually recursive — that's the whole trick and the whole difficulty.
- **Tokenizing vs parsing**: regex-able phase (lexical) vs grammar-driven phase (syntax). Keep them cleanly separate.
- **This is where automata theory pays off** (see [../../automata-theory](../../automata-theory/README.md)): CFGs, left-recursion, lookahead — the parser you write is a pushdown automaton in code form.

## Notes

- _status:_ not started
