export interface DualEngineConfig {
  mode: "esm" | "cjs";
  debug?: boolean;
}

export interface EngineStatus {
  runtime: string;
  format: "ESM" | "CommonJS";
  active: boolean;
}

export declare function initializeDualEngine(config?: DualEngineConfig): EngineStatus;
export declare const DUAL_PACKAGE_VERSION: string;
