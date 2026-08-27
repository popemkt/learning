import { computeLegacyA } from "./legacy-service-a.js";

export const LEGACY_B_ID = "LEGACY_B_V1";

export function computeLegacyB(seed: number): number {
  if (seed <= 0) return 0;
  return seed * 2 + computeLegacyA(seed - 1);
}
