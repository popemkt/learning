# TypeScript Features & Deep Dives

Dedicated workspace exploring TypeScript's type system features, compiler mechanics, language boundaries, common anti-patterns, and production-grade design patterns.

## Modules

- **[`casting/`](./casting/)**: Type Assertion Mechanics, The "Sufficient Overlap" Rule, Chain Casting Hazards (`as unknown as T`), and Safe Production Alternatives (Type Guards, Schema Validation, Mappers, `satisfies`).

## Quick Start

```bash
cd ts-features

# Run the interactive casting demo
bun run demo:casting

# Run the automated test suite
bun run test:casting
```
