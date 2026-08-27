import type { CoreConfig } from "../../core-pkg/src/index.js";
import { createCoreService } from "../../core-pkg/src/index.js";

export function runMissingRefApp(): string {
  const config: CoreConfig = {
    apiKey: "MISSING_REF_KEY",
    timeoutMs: 5000
  };
  return createCoreService(config);
}
