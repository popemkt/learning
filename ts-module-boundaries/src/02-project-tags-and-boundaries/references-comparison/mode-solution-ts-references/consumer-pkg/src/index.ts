import type { CoreConfig } from "../../core-pkg/src/index.js";
import { createCoreService } from "../../core-pkg/src/index.js";

export function runConsumerApp(): string {
  const config: CoreConfig = {
    apiKey: "SOLUTION_MODE_API_KEY",
    timeoutMs: 3000
  };
  return `Consumer Output: ${createCoreService(config)}`;
}
