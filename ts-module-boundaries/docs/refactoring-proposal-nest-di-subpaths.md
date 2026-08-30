# Architectural Proposal: Encapsulating NestJS DI in Swimlanes via `./nest` Subpaths & Narrow Config Interfaces

**Target Repository**: `draiver` (Monorepo)  
**Goal**: Decouple `apps/draiver-api` from manual swimlane executor provider wiring, eliminate `ApiConfig` leakage into libraries, and establish a framework-agnostic core with encapsulated NestJS DI entry points.  
**Inspiration / Analogue**: .NET `IServiceCollection` extension methods (`services.AddLens()`) + `IOptions<LensConfig>` pattern.

---

## 1. Executive Summary & Problem Statement

### Current State:
1. **Monolithic Provider Wiring in API**:  
   In `apps/draiver-api/src/plugins/plugins.module.ts`, the API application manually defines boilerplate factory providers for all 7 swimlanes (`LENS_EXECUTOR_PROVIDER`, `ANCHOR_EXECUTOR_PROVIDER`, `PROOF_EXECUTOR_PROVIDER`, etc.), manually handling lazy dynamic imports of `@draiver/swimlane-<lane>/engine`.
2. **Global Config Leakage (`ApiConfig`)**:  
   The factory providers inject `API_CONFIG` (`ApiConfig`), passing the application-wide configuration object into library executor factories. The libraries receive a massive configuration object containing database connection strings, auth secrets, and unrelated lane configs.
3. **Breach of Dependency Inversion**:  
   Libraries cannot declare their own standalone DI wiring because NestJS modules only exist at the application level.

### Target State:
1. **Curated `./nest` Subpath**:  
   Each swimlane library (`libs/swimlanes/*`) publishes a lightweight, optional `./nest` entry point in `package.json` `"exports"`.
2. **Narrow Domain Config Interface**:  
   Each lane defines its own typed `<Lane>Config` (e.g. `LensConfig`), specifying strictly the 3–4 fields it needs.
3. **Encapsulated Dynamic Module (`<Lane>Module.forRootAsync`)**:  
   The library owns its own NestJS DI registration. The API host simply registers `LensModule.forRootAsync(...)` in 1 line, mapping its validated config into the lane's narrow options.
4. **Pure Core Library (`.`)**:  
   The library root barrel `.` remains pure TypeScript with zero NestJS or Temporal dependencies.

---

## 2. Architectural Design: The 3-Tier Layering

```mermaid
graph TD
    subgraph "Host Application (apps/draiver-api)"
        ConfigService["AppConfigService<br/><i>(Zod-validated at boot)</i>"]
        AppMod["AppModule / PluginsModule"]
        
        AppMod -->|1-line registration| LensMod["LensModule.forRootAsync()<br/><i>(from '@draiver/swimlane-lens/nest')</i>"]
        ConfigService -.->|Maps typed slice only| LensMod
    end

    subgraph "Library (@draiver/swimlane-lens)"
        subgraph "Export: './nest'"
            LensMod --> Factory["Provider Factory<br/><i>(Binds laneExecutorToken)</i>"]
        end

        subgraph "Export: '.'"
            Factory -->|in_process| InProcess["InProcessLensExecutor<br/><i>(Zero @temporalio deps)</i>"]
            InProcess --> Steps["LensPipelineSteps<br/><i>(Core Logic)</i>"]
        end

        subgraph "Export: './engine'"
            Factory -->|temporal (Lazy)| TempExec["createTemporalLensExecutor<br/><i>(Temporal SDK)</i>"]
            TempExec --> Steps
        end
    end
```

---

## 3. Step-by-Step Implementation Blueprint

### Step 1: Add `"./nest"` to `package.json` & Update Harness Allowlist

In `libs/swimlanes/lens/package.json`:
```json
{
  "name": "@draiver/swimlane-lens",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./engine": {
      "types": "./dist/engine-index.d.ts",
      "default": "./dist/engine-index.js"
    },
    "./nest": {
      "types": "./dist/nest.d.ts",
      "default": "./dist/nest.js"
    }
  }
}
```

In `.harness/module-public-surface.test.mts`:
```typescript
// Update laneAllowedKeys to permit the curated './nest' entry point
const laneAllowedKeys = (l: LibInfo): string[] =>
  l.dir.startsWith(SWIMLANES_DIR) ? [".", LANE_ENGINE_SUBPATH, "./nest"] : ["."];
```

---

### Step 2: Define Narrow Library Config Interface

Create `libs/swimlanes/lens/src/lens-config.ts`:
```typescript
export interface LensConfig {
  /** Execution mode: in_process (in-memory) or temporal (remote worker) */
  engine: "in_process" | "temporal";
  /** Optional Temporal server address (only needed when engine === "temporal") */
  temporalAddress?: string;
  /** Optional custom task queue name */
  taskQueue?: string;
}

export const LENS_CONFIG = Symbol("LENS_CONFIG");
```

---

### Step 3: Implement `LensModule.forRootAsync` in `src/nest.ts`

Create `libs/swimlanes/lens/src/nest.ts`:
```typescript
import { DynamicModule, Module, type Provider } from "@nestjs/common";
import { InProcessLensExecutor } from "./in-process-lens-executor.js";
import { LensPipelineSteps } from "./lens-pipeline-steps.js";
import { LensPlugin } from "./lens.plugin.js";
import { LENS_CONFIG, type LensConfig } from "./lens-config.js";
import { laneExecutorToken, type LaneExecutor } from "@draiver/plugin-contracts";

export interface LensModuleAsyncOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => Promise<LensConfig> | LensConfig;
  extraProviders?: Provider[];
}

@Module({})
export class LensModule {
  static forRootAsync(options: LensModuleAsyncOptions): DynamicModule {
    return {
      module: LensModule,
      providers: [
        LensPipelineSteps,
        LensPlugin,
        InProcessLensExecutor,
        // 1. Bind the resolved narrow config
        {
          provide: LENS_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        // 2. Conditionally bind the executor token
        {
          provide: laneExecutorToken("lens"),
          useFactory: async (
            inProcess: InProcessLensExecutor,
            config: LensConfig
          ): Promise<LaneExecutor> => {
            if (config.engine !== "temporal") {
              return inProcess;
            }
            // Lazy load the Temporal engine subpath ONLY when configured for temporal
            const { createTemporalLensExecutor } = await import("./engine-index.js");
            return createTemporalLensExecutor(config);
          },
          inject: [InProcessLensExecutor, LENS_CONFIG],
        },
        ...(options.extraProviders || []),
      ],
      exports: [laneExecutorToken("lens"), LensPlugin, LensPipelineSteps],
    };
  }
}
```

---

### Step 4: Refactor Host Application Registration

In `apps/draiver-api/src/plugins/plugins.module.ts`:

#### Before (Monolithic Manual Wiring):
```typescript
// ❌ Old: 200 lines of manual factory providers coupling ApiConfig into every lane
const LENS_EXECUTOR_PROVIDER = {
  provide: laneExecutorToken("lens"),
  useFactory: async (inProcess: InProcessLensExecutor, config: ApiConfig) => {
    if (config.executionEngines.lens !== "temporal") return inProcess;
    const { createTemporalLensExecutor } = await import("@draiver/swimlane-lens/engine");
    return createTemporalLensExecutor(config);
  },
  inject: [InProcessLensExecutor, API_CONFIG],
};
```

#### After (Encapsulated 1-Line Module Registration):
```typescript
import { Module } from "@nestjs/common";
import { API_CONFIG, type ApiConfig } from "@draiver/api-config";
import { LensModule } from "@draiver/swimlane-lens/nest";
import { AnchorModule } from "@draiver/swimlane-anchor/nest";
import { ProofModule } from "@draiver/swimlane-proof/nest";
import { SparkModule } from "@draiver/swimlane-spark/nest";
import { AtlasModule } from "@draiver/swimlane-atlas/nest";
import { ForgeModule } from "@draiver/swimlane-forge/nest";
import { SignalModule } from "@draiver/swimlane-signal/nest";

@Module({
  imports: [
    LensModule.forRootAsync({
      inject: [API_CONFIG],
      useFactory: (config: ApiConfig) => ({
        engine: config.executionEngines.lens,
      }),
    }),
    AnchorModule.forRootAsync({
      inject: [API_CONFIG],
      useFactory: (config: ApiConfig) => ({
        engine: config.executionEngines.anchor,
      }),
    }),
    // ... remaining lanes
  ],
  exports: [
    LensModule,
    AnchorModule,
    // ...
  ]
})
export class PluginsModule {}
```

---

## 4. Verification & Acceptance Criteria

When executing this refactoring in `draiver`, the following automated checks MUST pass:

1. **Surface Harness Test**:
   ```bash
   pnpm run harness:check
   ```
   *Expectation*: Asserts all 7 swimlane packages cleanly expose `.` and `./nest` (and whitelisted `./engine`).
2. **Temporal Module Isolation Gate**:
   ```bash
   node --test apps/draiver-api/test/temporal-module-isolation.spec.ts
   ```
   *Expectation*: An `in_process` boot loads 0 `@temporalio/*` modules in `require.cache`.
3. **Unit Test Suite**:
   ```bash
   pnpm run test:unit
   ```
   *Expectation*: All unit tests pass across `apps/draiver-api` and `libs/swimlanes/*`.
4. **Boundary & Quality Lints**:
   ```bash
   pnpm run lint:all
   ```
   *Expectation*: `nx run-many -t lint` (Oxlint) and `pnpm run lint:boundaries` (ESLint) pass with zero errors.
5. **No `ApiConfig` Leakage**:
   *Verification*: `grep -rn "@draiver/api-config" libs/swimlanes/` returns **0 matches** outside root build files.

---

## 5. Summary of Architecture Benefits

| Principle | Impact |
| :--- | :--- |
| **Dependency Inversion** | Libraries declare their own narrow dependencies; host apps supply them via adapters. |
| **Encapsulated DI** | The 200-line monolithic `plugins.module.ts` reduces to clean module imports. |
| **Zero Config Leakage** | Database strings and root app secrets are never exposed to lane libraries. |
| **Dual-Mode Parity** | Local unit tests and CI run in 50ms in-process; production seamlessly activates Temporal over gRPC. |
| **Pure Core** | Non-NestJS consumers (CLI, scripts, worker isolates) import `.` with zero framework baggage. |
