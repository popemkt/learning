/**
 * index-access-types.test.ts
 *
 * Automated verification of Index Access Types.
 */

import { describe, it, expect } from "bun:test";
import {
  demonstrateIndexAccess,
  THEME_TOKENS,
  FormStateManager,
  WriteTargetForm,
} from "./01-index-access-mechanics";

describe("Index Access Types", () => {
  it("extracts and verifies unpacked array element types and const values", () => {
    const { sampleChecklist, themeColor, updatedForm } = demonstrateIndexAccess();

    expect(sampleChecklist.ruleId).toBe("RULE_G1_01");
    expect(sampleChecklist.status).toBe("pass");
    expect(themeColor).toBe(THEME_TOKENS.ACCENT_CYAN);
    expect(updatedForm.autoPr).toBe(true);
    expect(updatedForm.maxRetries).toBe(5);
    expect(updatedForm.provider).toBe("azure_devops");
  });

  it("updates form fields strictly according to T[K] property types", () => {
    const form = new FormStateManager<WriteTargetForm>({
      provider: "github",
      repositoryUrl: "https://github.com/my-org/my-repo",
      defaultBranch: "main",
      autoPr: false,
      maxRetries: 1,
    });

    form.setField("repositoryUrl", "https://dev.azure.com/my-org/my-repo");
    form.setField("maxRetries", 10);
    form.setField("autoPr", true);

    const state = form.getState();
    expect(state.repositoryUrl).toBe("https://dev.azure.com/my-org/my-repo");
    expect(state.maxRetries).toBe(10);
    expect(state.autoPr).toBe(true);
  });
});
