export interface CoreConfig {
  apiKey: string;
  timeoutMs: number;
}

export function createCoreService(config: CoreConfig): string {
  return `[CoreService initialized with timeout: ${config.timeoutMs}ms]`;
}
