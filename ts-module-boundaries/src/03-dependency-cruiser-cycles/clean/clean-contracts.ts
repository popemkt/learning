export interface SharedConfig {
  appId: string;
  version: string;
}

export const DEFAULT_CONFIG: SharedConfig = {
  appId: "acyclic-app",
  version: "1.0.0",
};
