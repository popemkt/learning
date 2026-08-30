/**
 * 04-as-vs-satisfies.ts
 *
 * Side-by-side comparison of `as TargetType` vs `satisfies TargetType` vs `const x: TargetType`.
 * Demonstrates:
 * 1. Type Widening vs. Exact Type Preservation
 * 2. Error Masking vs. Compile-time Contract Enforcement
 * 3. Exact Key Autocomplete & Property Navigation
 * 4. The Power of `as const satisfies Contract`
 */

// ============================================================================
// Scenario 1: Union Value Dictionary (Hex string OR RGB array)
// ============================================================================

export type ColorValue = string | [number, number, number];
export type PaletteConfig = Record<string, ColorValue>;

// ----------------------------------------------------------------------------
// Approach A: Type Annotation (`: PaletteConfig`)
// ----------------------------------------------------------------------------
// ⚠️ Widens all properties to `string | [number, number, number]`
const annotatedPalette: PaletteConfig = {
  primary: "#3b82f6",
  accent: [255, 128, 0],
};
// 🔒 COMPILE-TIME: 'annotatedPalette.primary' is string | [number, number, number]
// ❌ annotatedPalette.primary.toUpperCase() -> Error: Property 'toUpperCase' does not exist on type '[number, number, number]'.

// ----------------------------------------------------------------------------
// Approach B: Type Assertion (`as PaletteConfig`)
// ----------------------------------------------------------------------------
// ❌ FORBIDDEN: Not only widens the type, but also allows accidental bugs to pass!
const assertedPalette = {
  primary: "#3b82f6",
  accent: [255, 128, 0],
  typoField: 12345, // Not a valid ColorValue, but 'as' might swallow or misguide
} as PaletteConfig;

// ----------------------------------------------------------------------------
// Approach C: `satisfies PaletteConfig`
// ----------------------------------------------------------------------------
// ✅ ATTENTION: Validates that every property conforms to ColorValue,
// while preserving the exact inferred type:
// - primary is inferred as `string`
// - accent is inferred as `[number, number, number]`
export const satisfiesPalette = {
  primary: "#3b82f6",
  accent: [255, 128, 0],
} satisfies PaletteConfig;

export function demonstratePaletteSafety(): {
  primaryUpper: string;
  accentRedChannel: number;
} {
  // ✅ Type system knows 'primary' is string: .toUpperCase() is immediately available
  const primaryUpper = satisfiesPalette.primary.toUpperCase();

  // ✅ Type system knows 'accent' is array: array indexing / array methods work directly
  const accentRedChannel = satisfiesPalette.accent[0];

  return { primaryUpper, accentRedChannel };
}

// ============================================================================
// Scenario 2: Catching Typos & Missing Mandatory Fields
// ============================================================================

export interface UserContract {
  id: string;
  displayName: string;
  role: "admin" | "member";
}

export function demonstrateTypoCatching(): {
  satisfiesCatchesErrors: boolean;
  asMasksErrors: boolean;
} {
  // If a developer accidentally typos 'displayName' as 'name':

  // 1. With `satisfies UserContract`:
  // const badUser = {
  //   id: "u1",
  //   name: "Alice", // 💥 TS2353: Object literal may only specify known properties, and 'name' does not exist in type 'UserContract'.
  //   role: "admin",
  // } satisfies UserContract; // -> FAILS TO COMPILE (Safety guaranteed!)

  // 2. With `as UserContract`:
  // const badUser = {
  //   id: "u1",
  //   name: "Alice",
  //   role: "admin",
  // } as unknown as UserContract; // -> PASSES COMPILATION (Bug silently shipped!)

  return {
    satisfiesCatchesErrors: true,
    asMasksErrors: true,
  };
}

// ============================================================================
// Scenario 3: Exact Key Autocomplete (No Key Widening)
// ============================================================================

export type RoutesMap = Record<string, { path: string; requiresAuth: boolean }>;

export const appRoutes = {
  home: { path: "/", requiresAuth: false },
  dashboard: { path: "/dashboard", requiresAuth: true },
  settings: { path: "/settings", requiresAuth: true },
} satisfies RoutesMap;

// 🔒 COMPILE-TIME: 'keyof typeof appRoutes' is exactly "home" | "dashboard" | "settings"
// If we had used ': RoutesMap' or 'as RoutesMap', keys would be widened to 'string',
// losing autocomplete and allowing `appRoutes.nonExistentRoute` without compile error!

export type AppRouteKey = keyof typeof appRoutes; // "home" | "dashboard" | "settings"

export function getRoute(key: AppRouteKey): string {
  return appRoutes[key].path;
}

// ============================================================================
// Scenario 4: The Ultimate Immutable Pattern: `as const satisfies Contract`
// ============================================================================

export interface FeatureFlags {
  readonly [flag: string]: boolean | readonly string[];
}

export const activeFlags = {
  ENABLE_NEW_CHECKOUT: true,
  ALLOWED_DOMAINS: ["example.com", "app.example.com"],
} as const satisfies FeatureFlags;

// 🔒 COMPILE-TIME:
// 1. `satisfies FeatureFlags` ensures activeFlags matches the FeatureFlags contract.
// 2. `as const` ensures ALLOWED_DOMAINS is `readonly ["example.com", "app.example.com"]` (exact tuple).
// 3. activeFlags cannot be mutated at runtime.
