# TypeScript Features Master Taxonomy & Deep Dives

Dedicated workspace exploring TypeScript's type system features, compiler mechanics, language boundaries, common anti-patterns, and production-grade design patterns.

---

## 🗺️ Master TypeScript Feature Tracking Map

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      Complete TypeScript Feature Taxonomy & Progress Map                         │
├─────────────────────────┬──────────────────────────────────────────────────────────┬─────────────┤
│ Module Directory        │ Key Mechanics, Types & Operators                         │ Status      │
├─────────────────────────┼──────────────────────────────────────────────────────────┼─────────────┤
│ 1. `casting/`           │ `as`, `as unknown as`, `satisfies`, TS2352 overlap rule  │ ✅ Complete │
│ 2. `zod-type-inference/`│ `z.input<T>` vs `z.infer<T>`, `z.coerce`, `.default()`   │ ✅ Complete │
│ 3. `index-access-types/`│ `T[number]`, `T[K]`, `(typeof OBJ)[keyof typeof OBJ]`   │ ✅ Complete │
│ 4. `generics-currying/` │ `<K extends keyof T>`, curried adapters, `runForAgent`   │ ✅ Complete │
│ 5. `decorator-reflect/` │ `@Injectable()`, `emitDecoratorMetadata`, DI container   │ ✅ Complete │
│ 6. `ts-type-level-safe/`│ Nominal `Brand<T>`, Typestates, Phantom lifecycle tokens │ ✅ Complete │
│ 7. `ts-module-bounds/`  │ Curated `.` barrels, exports gating, Nx boundary tags    │ ✅ Complete │
└─────────────────────────┴──────────────────────────────────────────────────────────┴─────────────┘
```

---

## Quick Navigation

- **[`casting/`](./casting/)**: Type Assertion Mechanics, The "Sufficient Overlap" Rule, Chain Casting Hazards (`as unknown as T`), and Safe Production Alternatives (`satisfies`, Type Guards).
- **[`zod-type-inference/`](./zod-type-inference/)**: Understanding when Input Types differ from Inferred Output Types (`z.input<T>` vs `z.infer<T>`), defaults, and coercion.
- **[`index-access-types/`](./index-access-types/)**: Array element extraction (`T[number]`), property lookup types (`T[K]`), and dynamic key constraints.
- **[`generics-and-currying/`](./generics-and-currying/)**: Generic state setters, curried error code adapters, and higher-order execution sessions.
- **[`decorator-reflection/`](./decorator-reflection/)**: TypeScript metadata reflection (`Reflect.getMetadata`), parameter decorators, and custom Dependency Injection engines.

---

## Quick Start

```bash
cd ts-features

# Run all test suites
bun test

# Run strict TypeScript typecheck
bun x tsc --noEmit
```
