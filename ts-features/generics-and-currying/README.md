# Generics, Currying & Functional Patterns

An in-depth guide to advanced generic function signatures, curried higher-order adapters, and TypeScript 5.0+ const type parameters (`<const T>`).

---

## 1. Curried Error Transformers

Instead of writing repetitive `catch (err) { throw new DomainError(CODE, err) }` blocks across 20+ service methods, use curried error adapters:

```ts
const toPipelineError = (code: ErrorCodeKey) => (err: unknown): PipelineError => ...;

// Usage in async chains:
await docker.exec(cmd).catch(toPipelineError("SANDBOX_EXEC_FAILED"));
```

---

## 2. Const Type Parameters (`<const T>` in TypeScript 5.0+)

Prior to TS 5.0, functions accepting literal arrays or objects widened them to generic strings unless callers manually appended `as const`.

With `<const T>`:
```ts
function registerRoutes<const T extends readonly Route[]>(routes: T): T { ... }

// TypeScript automatically infers exact literals without 'as const':
const routes = registerRoutes([{ path: "/health", method: "GET" }]);
// routes[0].path is inferred as literal "/health" (not string)!
```
