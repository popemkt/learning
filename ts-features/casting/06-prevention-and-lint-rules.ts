/**
 * 06-prevention-and-lint-rules.ts
 *
 * Automated defenses against type assertion and chain-casting misuse:
 * 1. ESLint / typescript-eslint rule configs
 * 2. Oxlint configurations
 * 3. Custom AST selectors (no-restricted-syntax) to ban `as unknown as T`
 * 4. Compiler flag guardrails in tsconfig.json
 * 5. Shoehorn pattern for safe test mocking
 */

// ============================================================================
export const ESLINT_RULES_CONFIG = {
  // 🔒 COMPILE-TIME: Bans `as any` and `: any`
  "@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: true }],

  // 🔒 COMPILE-TIME: Flags redundant assertions where types are already compatible
  // (Would have immediately caught the 10x `agentInput as unknown as Record<string, unknown>` in draiver!)
  "@typescript-eslint/no-unnecessary-type-assertion": "error",

  // 🔒 COMPILE-TIME: Bans assertions on object literals, forcing `satisfies` or typed declarations
  "@typescript-eslint/consistent-type-assertions": [
    "error",
    {
      assertionStyle: "as",
      objectLiteralTypeAssertions: "never", // ❌ Banned: `{ ... } as User` -> ✅ Must use `satisfies User` or `const u: User = { ... }`
    },
  ],

  // 🔒 COMPILE-TIME: Strict type-safety boundary checks
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-return": "error",

  // 🔒 COMPILE-TIME: Custom AST selector to strictly ban double assertion (`as unknown as T` / `as any as T`)
  "no-restricted-syntax": [
    "error",
    {
      selector: "TSAsExpression > TSAsExpression",
      message:
        "Chain casting ('as unknown as Target' or 'as any as Target') is prohibited. Use type guards, Zod schema validation, or domain mappers instead.",
    },
    {
      selector: "TSTypeAssertion > TSTypeAssertion",
      message:
        "Double angle-bracket casting ('<Target><unknown>expr') is prohibited. Use runtime validation instead.",
    },
  ],
} as const;

// ============================================================================
// 2. Oxlint Configuration (.oxlintrc.json)
// ============================================================================

export const OXLINT_CONFIG = {
  rules: {
    "typescript/no-explicit-any": "error",
    "typescript/no-unsafe-declaration-merging": "error",
    "typescript/prefer-as-const": "error",
  },
};

// ============================================================================
// 3. Recommended tsconfig.json Compiler Guardrails
// ============================================================================

export const TSCONFIG_GUARDRAILS = {
  compilerOptions: {
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    exactOptionalPropertyTypes: true,
    noUncheckedIndexedAccess: true,
  },
};

// ============================================================================
// 4. Safe Test Double / Partial Mocking Helper (Shoehorn Alternative)
// ============================================================================

/**
 * A type-safe partial mock helper for tests that enforces that all provided keys
 * actually exist on the target interface, preventing typos and broken mocks.
 */
export function mockContract<TContract extends object>(
  partial: Partial<{ [K in keyof TContract]: TContract[K] }>
): TContract {
  return new Proxy(partial as object, {
    get(target, prop, receiver) {
      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }
      throw new Error(
        `[TestMockError]: Unmocked property or method '${String(prop)}' was called during test execution.`
      );
    },
  }) as TContract;
}
