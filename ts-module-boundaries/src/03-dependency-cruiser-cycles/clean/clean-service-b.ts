import { DEFAULT_CONFIG, type SharedConfig } from "./clean-contracts.js";

export function formatServiceBMessage(config: SharedConfig = DEFAULT_CONFIG): string {
  return `[ServiceB: ${config.appId} v${config.version}]`;
}
