/**
 * 01-index-access-mechanics.ts
 *
 * Demonstrates Index Access Types (Indexed Access Types / Lookup Types):
 * 1. Single Property Lookups (`T["property"]`)
 * 2. Nested Property Lookups (`T["parent"]["child"]`)
 * 3. Array Element Type Unpacking (`T[number]`)
 * 4. Tuple Positional Lookups (`Tuple[0]`, `Tuple[1]`)
 * 5. Value-Union Extraction (`(typeof OBJ)[keyof typeof OBJ]`)
 * 6. Generic Type-Safe Key-Value State Updaters (`<K extends keyof T>(k: K, v: T[K])`)
 */

// ============================================================================
// 1. Complex Domain Model
// ============================================================================

export interface HumanReviewPackage {
  id: string;
  reviewerNotes: string;
  checklistResults: Array<{
    ruleId: string;
    ruleName: string;
    status: "pass" | "fail" | "waived";
    severity: "low" | "medium" | "critical";
  }>;
  scores: {
    completenessScore: number;
    securityScore: number;
  };
}

// ============================================================================
// 2. Index Access Types in Action
// ============================================================================

// ✅ ATTENTION: Extract the checklist item type directly from the array property without declaring a redundant interface!
export type ChecklistItem = HumanReviewPackage["checklistResults"][number];

// ✅ Nested Lookup
export type ReviewScores = HumanReviewPackage["scores"];
export type CompletenessScore = HumanReviewPackage["scores"]["completenessScore"]; // number

// ============================================================================
// 3. Extracting Union of Values from a Const Object
// ============================================================================

export const THEME_TOKENS = {
  BG_PRIMARY: "#0f172a",
  BG_SURFACE: "#1e293b",
  TEXT_MAIN: "#f8fafc",
  ACCENT_CYAN: "#06b6d4",
} as const;

// 🔒 COMPILE-TIME: "BG_PRIMARY" | "BG_SURFACE" | "TEXT_MAIN" | "ACCENT_CYAN"
export type ThemeTokenKey = keyof typeof THEME_TOKENS;

// 🔒 COMPILE-TIME: "#0f172a" | "#1e293b" | "#f8fafc" | "#06b6d4"
export type ThemeTokenColor = (typeof THEME_TOKENS)[ThemeTokenKey];

// ============================================================================
// 4. Generic Key-Value State Updater (<K extends keyof T>)
// ============================================================================

export interface WriteTargetForm {
  provider: "github" | "azure_devops";
  repositoryUrl: string;
  defaultBranch: string;
  autoPr: boolean;
  maxRetries: number;
}

export class FormStateManager<TForm extends object> {
  constructor(private state: TForm) {}

  public getState(): Readonly<TForm> {
    return this.state;
  }

  /**
   * Type-safe property setter:
   * 🔒 COMPILE-TIME: 'value' MUST match the exact property type of 'TForm[K]'!
   */
  public setField<K extends keyof TForm>(key: K, value: TForm[K]): void {
    this.state = {
      ...this.state,
      [key]: value,
    };
  }
}

export function demonstrateIndexAccess(): {
  sampleChecklist: ChecklistItem;
  themeColor: ThemeTokenColor;
  updatedForm: WriteTargetForm;
} {
  const sampleChecklist: ChecklistItem = {
    ruleId: "RULE_G1_01",
    ruleName: "Architecture Scope Definition",
    status: "pass",
    severity: "critical",
  };

  const themeColor: ThemeTokenColor = THEME_TOKENS.ACCENT_CYAN;

  const form = new FormStateManager<WriteTargetForm>({
    provider: "github",
    repositoryUrl: "https://github.com/example/repo",
    defaultBranch: "main",
    autoPr: false,
    maxRetries: 3,
  });

  // ✅ Valid updates matching exact field types
  form.setField("autoPr", true);       // boolean
  form.setField("maxRetries", 5);      // number
  form.setField("provider", "azure_devops"); // "github" | "azure_devops"

  // 🔒 COMPILE-TIME: Swapped or invalid types are rejected:
  // form.setField("autoPr", "true"); // 💥 Error TS2345: Argument of type 'string' is not assignable to 'boolean'

  return {
    sampleChecklist,
    themeColor,
    updatedForm: form.getState() as WriteTargetForm,
  };
}
