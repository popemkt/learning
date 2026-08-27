import { computeLegacyB } from "./legacy-service-b.js";

export const LEGACY_A_ID = "LEGACY_A_V1";

export function computeLegacyA(seed: number): number {
  if (seed <= 0) return 0;
  return seed + computeLegacyB(seed - 1);
}
