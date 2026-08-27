import { formatFeatureLabel } from "./index.js";

export const FEATURE_CODE = "FEAT_CORE_100";

export function getFeatureSummary(): string {
  // Indirect cycle: feature -> barrel (index.ts) -> helper -> feature
  return `Feature Summary: ${formatFeatureLabel(FEATURE_CODE)}`;
}
