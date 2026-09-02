# category-theory

Primer on category theory and type theory for programmers — vocabulary for composing abstractions, and the math behind the type-level work in [ts-type-level-safety](../../ts-type-level-safety/README.md) and [ts-features](../../ts-features/README.md).

## Study order

1. **Categories** — objects, morphisms, composition, identity. Examples: sets+functions, types+programs.
2. **Functors & natural transformations** — `map` is a functor law-abiding lift; natural transformations are the "polymorphic with laws" idea.
3. **Products, coproducts, exponentials** — why sum types (discriminated unions) and function types have universal definitions.
4. **Monads & Kleisli composition** — `Promise.then`, array flatMap, parser combinators: all the same pattern.
5. **Type theory bridge** — Curry–Howard (propositions = types, proofs = programs), parametricity ("theorems for free"), then dependent types if appetite remains.

## Why it pairs with the CS track

- Curry–Howard makes compiler/typechecker work from the N2T software half meaningful beyond engineering.
- Algebraic data types (product/sum) explain why discriminated unions + exhaustive switches eliminate impossible states — the runtime proof behind the ts-type-level-safety experiments.

## Live resources

- Bartosz Milewski, *Category Theory for Programmers* (free book + lecture series): https://github.com/hmemcpy/milewski-ctfp-pdf
- Milewski video lectures: https://www.youtube.com/playlist?list=PLbgaMIhjbmEnaH_LTkxLI7FMa2HsnawM_
- Steve Awodey, *Category Theory* (Oxford Logic Guides) — math-first alternative.
- Benjamin Pierce, *Types and Programming Languages* — the type-theory bridge text.
- Catsters (short video lectures): https://www.youtube.com/user/TheCatsters

## Notes

- _status:_ not started

## Hands-on

- Apply the vocabulary in TypeScript: [fantasy-land](https://github.com/fantasyland/fantasy-land) (algebra laws for FP structures) and the [Mostly Adequate Guide to FP](https://github.com/MostlyAdequate/mostly-adequate-guide) (free book, JS)
- Prove it locally: the [ts-type-level-safety](../../ts-type-level-safety/README.md) and [ts-features](../../ts-features/README.md) experiments are the executable version of these ideas — sum types, smart constructors, typestate
