import type { DualEngineConfig, EngineStatus } from "./index.d.ts";

export const DUAL_PACKAGE_VERSION = "2.4.0";

export function initializeDualEngine(config: DualEngineConfig = { mode: "esm" }): EngineStatus {
  return {
    runtime: `Node.js / Bun (ESM) [mode: ${config.mode || "esm"}]`,
    format: "ESM",
    active: true
  };
}
