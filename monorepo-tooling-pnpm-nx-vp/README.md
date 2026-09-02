# Monorepo Tooling Architecture: PNPM × Nx × vp (Vite-Plus)

> **Deep-dive architectural guide, mechanics, anti-patterns, and unification blueprint for modern TypeScript monorepos.**

---

## Executive Summary: Are we mixing pnpm, Nx, and vp too much?

**Short Answer:** In `draiver`, the three tools are **conceptually complementary**, but their **execution boundaries currently overlap and conflict** in several key places.

When used correctly:
- **`pnpm`** is the **Package Manager & Workspace Layout Engine**.
- **`Nx`** is the **Task Orchestrator & Computation Cache**.
- **`vp` (Vite-Plus)** is the **Inner-Loop Toolchain Engine** (fast formatter, linter, bundler, and test runner).

### Where the Friction Occurs in Draiver Today:
1. **Dual Task Orchestration**: The root `package.json` mixes `nx run-many -t build` with `pnpm --workspace-concurrency=1 -r run test`. This creates two competing execution paths. Tests bypass Nx computation caching and run sequentially.
2. **Sub-package Self-Building Anti-Pattern**: Sub-packages (like `libs/draiver-domain` or `apps/draiver-api`) define test scripts as `"test": "pnpm run clean:dist && pnpm run build && node --test ..."`. Because Nx already orchestrates `dependsOn: ["^build"]`, packages end up rebuilding themselves and upstream dependencies *twice*, doubling build times and invalidating caches.
3. **Split Linter Mental Model**: Developers wonder why both `vp lint` and `eslint` exist. (Oxlint runs fast syntax & complexity checks; ESLint runs `@nx/enforce-module-boundaries` graph rules).
4. **Fragmented Test Runners**: `draiver-studio` runs `vp test` directly on TypeScript source files in memory, while backend packages compile to `dist/` before running `node --test`, causing stale `dist/` orphan hazards.

---

## The Golden Monorepo Triangle

```
                          ┌─────────────────────────────────────────┐
                          │         pnpm (Package Manager)          │
                          │ • Workspace Topology (apps/*, libs/*)   │
                          │ • Version Catalogs (catalog: in yaml)   │
                          │ • Content-Addressable Store (CAS)       │
                          │ • Strict Symlink Isolation (No Phantoms)│
                          └────────────────────┬────────────────────┘
                                               │
                               Powers Graph & Dependencies
                                               │
                                               ▼
                          ┌─────────────────────────────────────────┐
                          │         Nx (Task Orchestrator)          │
                          │ • DAG Task Graph Scheduling (dependsOn) │
                          │ • Computation Cache (Input Hash -> dist)│
                          │ • Change Detection (nx affected)        │
                          │ • Architecture Boundary Enforcement     │
                          └────────────────────┬────────────────────┘
                                               │
                               Executes Individual Tasks Via
                                               │
                                               ▼
                          ┌─────────────────────────────────────────┐
                          │      vp / Vite-Plus (Tool Engine)       │
                          │ • Fast Formatting (Oxfmt / vp fmt)      │
                          │ • Fast Linting (Oxlint / vp lint)       │
                          │ • Fast Frontend Bundling (Vite/Rolldown)│
                          │ • Fast Headless Testing (Vitest/vp test)│
                          └─────────────────────────────────────────┘
```

### Responsibility Matrix

| Responsibility | Tool | Why this tool owns it | Anti-Pattern to AVOID |
| :--- | :---: | :--- | :--- |
| **Dependency Resolution** | `pnpm` | Content-addressable storage + strict symlink isolation prevents phantom dependencies. `catalog:` centralizes versions. | ❌ Do NOT use `pnpm -r run <task>` to build or test packages (lacks DAG caching). |
| **Task Graph & Caching** | `Nx` | Resolves `dependsOn: ["^build"]`, hashes inputs, caches outputs, parallelizes across topological levels, and calculates `affected`. | ❌ Do NOT let sub-package scripts self-chain builds (`pnpm run build && test`). |
| **Module Boundaries** | `Nx` | Tag-based rules (`scope:*`, `layer:*`) prevent illegal cross-swimlane imports and architectural layer inversion. | ❌ Do NOT rely solely on code-review discipline without machine gates. |
| **Formatting** | `vp` | `vp fmt` (Oxfmt in Rust) formats 350+ files in <100ms inside pre-commit hooks. | ❌ Do NOT run slow JS formatters (e.g. standalone Prettier) in hot paths. |
| **Code Quality & Complexity** | `vp` | `vp lint` (Oxlint) evaluates syntax, React hooks, and `.oxlintrc.json` complexity sensors (max-lines, cyclomatic complexity). | ❌ Do NOT use ESLint for standard JS/TS rules when Oxlint is 50x faster. |
| **Module Boundary Linting** | `ESLint` | Reserved *exclusively* for `@nx/enforce-module-boundaries` until Oxlint supports custom monorepo graph plugins. | ❌ Do NOT mix code quality rules into ESLint; keep ESLint strictly boundary-focused. |
| **Bundling & Dev Server** | `vp` | Next-gen Vite + Rolldown engine in `apps/draiver-studio`. | ❌ Do NOT maintain legacy Webpack/Babel pipelines. |
| **Unit Testing** | `vp` / `node` | `vp test` (Vitest) for source TS testing; `node --test` for backend contracts. | ❌ Do NOT run cold `tsc` compilations inside test runners. |

---

## The Four Lessons

### Lesson 1: PNPM (The Package & Workspace Manager)
- **Centralized Catalogs (`catalog:`)**: Defined in `pnpm-workspace.yaml`. Sub-packages reference `"zod": "catalog:"` rather than repeating version numbers. Prevents subtle mismatch bugs across 20+ packages.
- **Strict Symlinked `node_modules`**: Unlike npm/yarn which hoist packages into a flat root, pnpm creates nested symlinks into `.pnpm/<pkg>@<ver>/node_modules/<pkg>`. If package A doesn't declare package B in its `package.json`, Node will reject `import 'B'`, even if package C uses B.
- **Workspace Protocol (`workspace:*`)**: Links local packages directly without requiring publishing.

```typescript
// ✅ ATTENTION: "catalog:" resolves from root pnpm-workspace.yaml
// 🔒 COMPILE-TIME: workspace:* resolves directly to workspace sibling package
// ❌ FORBIDDEN: pnpm -r run build lacks computation caching & optimal DAG parallelism
```

### Lesson 2: Nx (Task Graph & Computation Cache)
- **DAG Topological Scheduling**: Nx builds a Directed Acyclic Graph. For `apps/draiver-api:build`, it knows `libs/draiver-domain` and `libs/swimlanes/*` must build first (`"dependsOn": ["^build"]`).
- **Computation Caching**: Inputs (source files, configs, lockfile) are hashed. If the hash matches a previous run, Nx replays outputs (`dist/`) in **0ms**.
- **Change Detection (`nx affected`)**: In CI, `nx affected -t build,test,lint --base=origin/master` runs only on projects touched by the PR diff.
- **Tag-Based Architectural Boundaries**:
  - `scope:app` → may depend on `scope:swimlane`, `scope:shared`
  - `scope:swimlane` → may depend on `scope:shared` (**NEVER sibling swimlanes!**)
  - `layer:domain` → pure floor (**NEVER depends on `layer:infrastructure` or `layer:application`**)

### Lesson 3: vp / Vite-Plus (High-Speed Developer Toolchain)
- **VoidZero Unified Binary**: Single binary providing `vp fmt` (Oxfmt), `vp lint` (Oxlint), `vp dev`/`vp build` (Vite/Rolldown), and `vp test` (Vitest).
- **The 2-Tier Linter Model**:
  - **Tier 1 (`vp lint` / Oxlint)**: Fast inner-loop linter. Evaluates syntax, correctness, React hooks, and complexity ratchets (`max-lines: 900`, `complexity: 20`, `max-params: 5`).
  - **Tier 2 (`eslint` + `@nx/eslint-plugin`)**: Monorepo-aware graph boundary checks (`@nx/enforce-module-boundaries`).
- **Direct TS Testing vs Compiled dist/**:
  - `vp test` transforms TypeScript in-memory via esbuild/Rolldown (instant feedback, 0 disk artifacts).
  - Backend packages compiling to `dist/` risk **stale dist orphans** (deleted source specs lingering in `dist/` unless wiped).

### Lesson 4: Unified Architecture & Draiver Action Plan
- Harmonizes all 3 tools into a single, predictable workflow.
- Eliminates dual orchestration and redundant builds.

---

## Draiver Monorepo Unification Blueprint

### 1. Root `package.json` Consolidation
```diff
  "scripts": {
    "dev": "pnpm run dev:all",
    "dev:all": "node scripts/run-dev-stack.mjs mocks",
-   "build": "pnpm run build:all",
-   "build:all": "nx run-many -t build",
+   "build": "nx run-many -t build",
-   "test": "pnpm run test:all",
-   "test:all": "nx run-many -t typecheck && pnpm run test:unit && pnpm run lint && pnpm run harness:check",
-   "test:unit": "pnpm --workspace-concurrency=1 --filter './libs/**' --filter './apps/**' -r run --if-present test && pnpm run test:scripts",
+   "test": "nx run-many -t test && pnpm run harness:check",
-   "typecheck": "pnpm run typecheck:all",
-   "typecheck:all": "nx run-many -t typecheck",
+   "typecheck": "nx run-many -t typecheck",
-   "lint": "pnpm run lint:all",
-   "lint:all": "nx run-many -t lint && pnpm run lint:boundaries",
+   "lint": "nx run-many -t lint && pnpm run lint:boundaries",
    "lint:boundaries": "eslint libs apps/draiver-api/src",
    "fmt": "vp fmt apps libs scripts --write",
    "fmt:check": "vp fmt apps libs scripts --check",
-   "affected": "nx affected -t build,test,lint --base=master",
+   "affected": "nx affected -t build,test,lint --base=origin/master"
  }
```

### 2. Sub-Package `package.json` Cleanup (Atomic Scripts)
In `libs/draiver-domain`, `apps/draiver-api`, `libs/swimlanes/*`:
```diff
  "scripts": {
    "build": "tsc -p tsconfig.json",
-   "clean:dist": "node -e \"require('node:fs').rmSync('dist',{recursive:true,force:true})\"",
-   "lint": "vp lint . -c ../../.oxlintrc.json",
+   "lint": "vp lint",
-   "test": "pnpm run clean:dist && pnpm run build && node --test \"dist/**/*.spec.js\""
+   "test": "node --test \"dist/**/*.spec.js\""
  }
```

> **Why this matters**: Removing `pnpm run build &&` stops packages from triggering redundant sub-builds when Nx runs tasks. Nx's `"dependsOn": ["^build"]` in `nx.json` already ensures dependencies are built and cached!

---

## Interactive Demos & Commands

Run all demonstrations and test suites directly from this repository:

```bash
# Run the Master Interactive Tour (all 4 lessons)
bun run demo

# Run individual lesson demonstrations
bun run demo:pnpm       # Lesson 1: pnpm catalogs & isolation
bun run demo:nx         # Lesson 2: Nx DAG, caching & boundaries
bun run demo:vp         # Lesson 3: vp toolchain, Oxlint & test models
bun run demo:unified    # Lesson 4: Unified Monorepo Triangle & Draiver Blueprint

# Run the automated test suite
bun test
```

---

## Attention Markers Used in Examples

To maintain strict code clarity and architectural discipline:
- `// ✅ ATTENTION:` Highlights key architectural decisions and correct patterns.
- `// ⚠️ CRITICAL:` Warns against anti-patterns, cache invalidation traps, or silent failures.
- `// ❌ FORBIDDEN:` Prohibits dangerous constructs (e.g. self-building test scripts, phantom imports).
- `// 🔒 COMPILE-TIME:` Marks compile-time guarantees (e.g. catalog resolution, boundary tag constraints).
