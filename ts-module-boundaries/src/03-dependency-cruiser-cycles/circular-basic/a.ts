import { getBValue } from "./b.js";

export const A_NAME = "ModuleA";

export function getAValue(): string {
  return `[A says: ${A_NAME} + ${getBValue()}]`;
}

// Runtime trap demonstration: When evaluated top-level during cyclic import,
// getBValue() reads A_NAME before a.ts has finished initialization!
export function getRuntimeCycleSnapshot(): { aName: string; bValue: string } {
  return {
    aName: A_NAME,
    bValue: getBValue(),
  };
}
