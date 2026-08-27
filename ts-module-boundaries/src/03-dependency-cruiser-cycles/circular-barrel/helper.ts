import { FEATURE_CODE } from "./feature.js";

export function formatFeatureLabel(code: string = FEATURE_CODE): string {
  return `[LABEL: ${code.toUpperCase()}]`;
}
