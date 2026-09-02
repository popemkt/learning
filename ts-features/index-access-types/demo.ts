/**
 * demo.ts
 *
 * Interactive tour demonstrating Index Access Types with inline code snippets.
 */

import { demonstrateIndexAccess } from "./01-index-access-mechanics";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function codeSnippet(title: string, code: string): void {
  console.log(`  ${colors.dim}┌─ 💻 ${colors.cyan}${title}${colors.dim} ──────────────────────────────────────────${colors.reset}`);
  for (const line of code.trim().split("\n")) {
    console.log(`  ${colors.dim}│${colors.reset}  ${line}`);
  }
  console.log(`  ${colors.dim}└─────────────────────────────────────────────────────────────${colors.reset}\n`);
}

export function runDemo(): void {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║  Index Access Types (T[number], T[K], keyof typeof)                        ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // 1. Array Element Unpacking
  codeSnippet("1. Array Element Unpacking (T[number])", `
interface HumanReviewPackage {
  checklistResults: Array<{ ruleId: string; status: "pass" | "fail" }>;
}

// ✅ Extracts inner element type without redundant interface declarations:
type ChecklistItem = HumanReviewPackage["checklistResults"][number];
  `);
  const { sampleChecklist, themeColor, updatedForm } = demonstrateIndexAccess();
  console.log(`  ${colors.green}✔ Extracted ChecklistItem:${colors.reset} ${sampleChecklist.ruleId} - ${sampleChecklist.ruleName} [${sampleChecklist.status}]\n`);

  // 2. Const Object Value Union
  codeSnippet("2. Value Union Extraction ((typeof OBJ)[keyof typeof OBJ])", `
export const THEME_TOKENS = {
  BG_PRIMARY: "#0f172a",
  ACCENT_CYAN: "#06b6d4",
} as const;

type ThemeTokenKey = keyof typeof THEME_TOKENS; // "BG_PRIMARY" | "ACCENT_CYAN"
type ThemeTokenColor = (typeof THEME_TOKENS)[ThemeTokenKey]; // "#0f172a" | "#06b6d4"
  `);
  console.log(`  ${colors.green}✔ ThemeTokenColor value:${colors.reset} ${themeColor}\n`);

  // 3. Generic Key-Value Setter
  codeSnippet("3. Generic Key-Value Setter (<K extends keyof T>(k: K, v: T[K]))", `
class FormManager<TForm extends object> {
  // 🔒 COMPILE-TIME: value MUST match the exact property type of TForm[K]!
  setField<K extends keyof TForm>(key: K, value: TForm[K]): void {
    this.state = { ...this.state, [key]: value };
  }
}
  `);
  console.log(`  ${colors.green}✔ Updated Form State:${colors.reset} Provider='${updatedForm.provider}', AutoPR=${updatedForm.autoPr}, Retries=${updatedForm.maxRetries}\n`);

  console.log(`${colors.bold}${colors.green}✔ Index Access Types verified!${colors.reset}\n`);
}

if (import.meta.main) {
  runDemo();
}
