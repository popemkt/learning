import { A_NAME } from "./a.js";

export const B_NAME = "ModuleB";

export function getBValue(): string {
  // If called during cyclic module evaluation, A_NAME is undefined / TDZ trap.
  return `[B says: ${B_NAME} and knows A is ${A_NAME ?? "UNDEFINED_DURING_INIT"}]`;
}
