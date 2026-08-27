# Concept 3: Dependency Cruiser & File-Level Cycles

> **Layer 3 of the 5-Layer Defense-in-Depth Model**  
> **Core Guarantee**: Prevent circular dependency bugs at the file and barrel-export level, and freeze legacy debt with baselined exceptions.

---

## 1. The Fundamental Problem: JavaScript Circular Dependencies & Runtime `undefined`

In JavaScript and TypeScript, circular imports (`Module A -> Module B -> Module A`) compile without errors. However, at runtime, the ECMAScript module loader must evaluate one module before the other has finished executing.

### The Runtime Traps:
1. **Uninitialized Binding / `undefined`**: One module reads an imported variable or class before it has been initialized, yielding `undefined`.
2. **Temporal Dead Zone (TDZ) Errors**: `ReferenceError: Cannot access 'X' before initialization`.
3. **Flaky / Non-deterministic Tests**: A file might load successfully in one test suite because helper `B` was imported first, but fail in production or another test suite because `A` was imported first.

---

## 2. The .NET / C# Analogue

| .NET / C# | TypeScript / JavaScript Parity |
| :--- | :--- |
| MSBuild build error:<br/>`Circular dependency detected between projects X and Y` | `dependency-cruiser`<br/>rule: `no-circular` (severity: `error`) |
| NDepend Dependency Structure Matrix (DSM) | `dependency-cruiser` visual graphs & cycle reporter |
| Assembly references enforce tree hierarchy | File-level directed graph static analysis |

In .NET, MSBuild refuses circular project references outright. However, because TypeScript files within the same package can reference each other freely, we need file-level static analysis via **`dependency-cruiser`**.

---

## 3. The Two Types of Circular Dependencies

### A. Direct Circular Dependency (`a.ts <-> b.ts`)
```typescript
// a.ts
import { b } from "./b.js";
export const a = "ModuleA";
console.log("A sees B as:", b); // ⚠️ Often undefined!

// b.ts
import { a } from "./a.js";
export const b = "ModuleB";
console.log("B sees A as:", a);
```

### B. The Barrel Re-Export Cycle Trap
Barrel files (`index.ts`) frequently create hidden cycles that project-level linters cannot see:

```mermaid
graph LR
    Feature["feature.ts"] --> Barrel["index.ts"]
    Barrel --> Helper["helper.ts"]
    Helper --> Feature
```

1. `feature.ts` imports a helper via package root `index.ts`.
2. `index.ts` re-exports all files in the package (including `helper.ts` and `feature.ts`).
3. `helper.ts` needs a type or constant from `feature.ts`.
4. Result: A 3-node cycle (`feature -> index -> helper -> feature`) that silently corrupts runtime state.

---

## 4. Configuration: `.dependency-cruiser.cjs`

```javascript
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies cause runtime TDZ and undefined initialization traps.",
      from: {},
      to: {
        circular: true,
        // FREEZE LEGACY TECH DEBT:
        // Existing cycles are baselined here so old debt is frozen,
        // but ANY new circular dependency will immediately break CI!
        pathNot: "^src/03-dependency-cruiser-cycles/circular-legacy"
      }
    },
    {
      name: "no-domain-to-infrastructure",
      severity: "error",
      comment: "Clean architecture rule: domain must not import infrastructure.",
      from: { path: "^src/02-project-tags-and-boundaries/packages/domain" },
      to: { path: "^src/02-project-tags-and-boundaries/packages/infrastructure" }
    }
  ],
  options: {
    doNotFollow: {
      path: "node_modules"
    },
    tsPreCompilationDeps: true
  }
};
```

---

## 5. Practical Strategy: Freezing Legacy Cycles

When introducing `dependency-cruiser` to an existing codebase with dozens of existing cycles:
1. **Do not disable the rule**: Setting the rule to `warn` causes developers to ignore new cycles.
2. **Freeze the baseline**: Add the existing legacy paths to the `pathNot` exception list with a comment and tracking issue.
3. **Keep severity at `error`**: Any *new* cycle introduced in a PR immediately fails the build.
4. **Gradual payoff**: As engineers refactor legacy modules, removing entries from `pathNot` is a satisfying, measurable reduction in technical debt.

---

## 6. Code Walkthrough in this Folder

```text
03-dependency-cruiser-cycles/
├── cycle-detector.ts           # Graph DFS engine detecting cycles and testing baselining
├── circular-basic/             # Direct a.ts <-> b.ts cycle trap
│   ├── a.ts
│   └── b.ts
├── circular-barrel/            # Barrel re-export cycle trap
│   ├── index.ts
│   ├── feature.ts
│   └── helper.ts
├── circular-legacy/            # Baselined legacy debt (whitelisted in config)
│   ├── legacy-service-a.ts
│   └── legacy-service-b.ts
└── clean/                      # Clean acyclic architecture
    ├── service-a.ts
    ├── service-b.ts
    └── shared-types.ts
```

---

## 7. How to Run & Verify

```bash
# Run the concept demo (runs cycle detection on all sample cases)
bun run src/demo.ts 3

# Run dependency-cruiser CLI directly
bun run lint:depgraph

# Run the test suite
bun test tests/03-dependency-cruiser-cycles.test.ts
```
