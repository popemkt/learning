# Concept 2: Project Tags & Module Boundaries (`@nx`)

> **Layer 2 of the 5-Layer Defense-in-Depth Model**  
> **Core Guarantee**: Enforce directional Clean Architecture layering and feature swimlane isolation across monorepo projects.

---

## 1. The Fundamental Problem: Monorepo Architecture Decay

In a TypeScript monorepo with multiple packages or apps, the TypeScript compiler allows any package to import any other package:

```typescript
// Inside packages/domain/src/user.ts
// 🚨 Architectural Inversion: Domain importing Infrastructure!
import { PostgresConnection } from "@monorepo/infrastructure";

// Inside packages/feature-billing/src/checkout.ts
// 🚨 Cross-Feature Coupling: Billing importing Analytics directly!
import { trackFunnelEvent } from "@monorepo/feature-analytics";
```

### Why this happens:
- In a team's codebase, architectural rules like *"Domain must never import Infrastructure"* or *"Features must communicate via events, not direct imports"* are often just verbal agreements or wiki documents.
- Under deadline pressure, developers make direct cross-package imports, turning a clean modular architecture into an entangled **"distributed monolith"**.

---

## 2. The .NET / C# Analogue

| .NET / C# | TypeScript Monorepo Parity | Enforcement Mechanism |
| :--- | :--- | :--- |
| `<ProjectReference Include="..\Domain.csproj" />` | `package.json` `"dependencies": { "@monorepo/domain": "workspace:*" }` | pnpm workspace symlinks + `package.json` |
| Missing reference compile error | Fails if import is not declared in `package.json` dependencies | ESLint `enforceBuildableLibDependency: true` |
| ArchUnitNET / NetArchTest rule:<br/>`Types().That().ResideInNamespace("Domain").ShouldNot().HaveDependencyOn("Infrastructure")` | ESLint `@nx/enforce-module-boundaries`<br/>with `depConstraints` | `@nx/eslint-plugin` layer/scope validation |
| Assembly separation per feature | Project Tags (`scope:billing`, `scope:analytics`) | Monorepo Project Graph |

### The "Phantom Dependency" Problem & How We Enforce Declared References
In naive TypeScript setups, a package can import another workspace package without listing it in its `package.json` dependencies (a **"Phantom Dependency"**), leading to isolated Docker build failures and broken CI caches.

We enforce declared references via three complementary layers:
1. **`enforceBuildableLibDependency: true` (ESLint `@nx`)**: Fails CI with an error if code imports a package not declared in `package.json` dependencies.
2. **Strict pnpm Workspace Isolation**: pnpm creates isolated `node_modules` per package containing only explicitly declared dependencies.
3. **TypeScript Project References (`composite: true` + `references`)**: `tsc -b` refuses compilation if `tsconfig.json` lacks a declared reference to the target project.
---

## 3. The Two-Axis Tagging Matrix

Every project in the monorepo is tagged along two orthogonal axes:

```mermaid
graph TD
    subgraph "Clean Architecture Layers (layer:*)"
        Domain["layer:domain<br/>(Pure business rules)"]
        Application["layer:application<br/>(Use cases & ports)"]
        Infrastructure["layer:infrastructure<br/>(Adapters & DB)"]
        Feature["layer:feature<br/>(UI & Endpoints)"]
    end

    subgraph "Feature Swimlanes (scope:*)"
        Shared["scope:shared"]
        Billing["scope:billing"]
        Analytics["scope:analytics"]
    end

    Application --> Domain
    Infrastructure --> Application
    Infrastructure --> Domain
    Feature --> Application
    Feature --> Domain

    Domain -.->|❌ BLOCKED| Infrastructure
    Billing -.->|❌ BLOCKED| Analytics
```

### 1. The Layer Axis (`layer:*`)
- `layer:domain` $\rightarrow$ May only depend on `layer:domain`.
- `layer:application` $\rightarrow$ May depend on `layer:domain`, `layer:application`.
- `layer:infrastructure` $\rightarrow$ May depend on `layer:application`, `layer:domain`, `layer:infrastructure`.
- `layer:feature` $\rightarrow$ May depend on `layer:application`, `layer:domain`, `layer:feature`.

### 2. The Scope Axis (`scope:*`)
- `scope:shared` $\rightarrow$ Utility/core libraries usable by all scopes.
- `scope:billing` $\rightarrow$ May only depend on `scope:billing` or `scope:shared`.
- `scope:analytics` $\rightarrow$ May only depend on `scope:analytics` or `scope:shared`.
- **Rule**: Sibling feature scopes may **never** import each other directly.

---

## 4. Configuration: ESLint Flat Config (`depConstraints`)

In `eslint.config.mjs`:

```javascript
import nxPlugin from "@nx/eslint-plugin";

export default [
  {
    plugins: { "@nx": nxPlugin },
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            // Layer Rules
            {
              sourceTag: "layer:domain",
              onlyDependOnLibsWithTags: ["layer:domain"]
            },
            {
              sourceTag: "layer:application",
              onlyDependOnLibsWithTags: ["layer:domain", "layer:application"]
            },
            {
              sourceTag: "layer:infrastructure",
              onlyDependOnLibsWithTags: ["layer:infrastructure", "layer:application", "layer:domain"]
            },
            // Scope / Swimlane Rules
            {
              sourceTag: "scope:billing",
              onlyDependOnLibsWithTags: ["scope:billing", "scope:shared"]
            },
            {
              sourceTag: "scope:analytics",
              onlyDependOnLibsWithTags: ["scope:analytics", "scope:shared"]
            }
          ]
        }
      ]
    }
  }
];
```

---

## 5. Code Walkthrough in this Folder

```text
02-project-tags-and-boundaries/
├── boundary-engine.ts          # Core rule validation engine implementing depConstraints algorithm
├── eslint.config.sample.js     # Production-ready ESLint flat configuration sample
├── demo.ts                     # Runnable demo showing legal edges and blocked violations
└── packages/
    ├── domain/                 # Tags: ["layer:domain", "scope:shared"]
    ├── application/            # Tags: ["layer:application", "scope:shared"]
    ├── infrastructure/         # Tags: ["layer:infrastructure", "scope:shared"]
    ├── feature-billing/        # Tags: ["layer:feature", "scope:billing"]
    └── feature-analytics/      # Tags: ["layer:feature", "scope:analytics"]
```

---

## 6. How to Run & Verify

```bash
# Run the concept demo (validates allowed flows & demonstrates blocked violations)
bun run src/demo.ts 2

# Run the test suite
bun test tests/02-project-tags-and-boundaries.test.ts
```
