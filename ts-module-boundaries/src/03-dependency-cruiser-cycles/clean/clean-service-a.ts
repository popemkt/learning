import { DEFAULT_CONFIG, type SharedConfig } from "./clean-contracts.js";

export function formatServiceAMessage(config: SharedConfig = DEFAULT_CONFIG): string {
  return `[ServiceA: ${config.appId} v${config.version}]`;
}
