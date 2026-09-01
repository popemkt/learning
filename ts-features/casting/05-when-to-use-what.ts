/**
 * 05-when-to-use-what.ts
 *
 * Concrete guide and implementation examples for:
 * - When to use Zod / Schema Validation (Runtime Boundaries)
 * - When to use `satisfies` (Static in-code structures, zero runtime cost)
 * - When to use `as Type` (The legitimate 1% escape hatches)
 * - When to use `as const` (Literal single-source-of-truth)
 */

// ============================================================================
// 1. Where ZOD / Runtime Schema Validation Belongs
// ============================================================================
// Rule: Use Zod when data crosses an untrusted/external RUNTIME boundary.
// (HTTP APIs, JSON.parse, query params, FormData, WebSockets, env vars, SQLite/Postgres)

export interface UserDto {
  id: string;
  email: string;
  age: number;
}

/**
 * Simulates lightweight runtime boundary parsing.
 * Real-world would use: `z.object({ id: z.string(), email: z.string().email(), age: z.number() })`
 */
export function validateRuntimeBoundary(raw: unknown): UserDto {
  // ✅ ATTENTION: At a runtime boundary, neither `as` nor `satisfies` helps.
  // Only runtime schema validation ensures the data exists in memory.
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid payload: expected object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["id"] !== "string" || typeof obj["email"] !== "string" || typeof obj["age"] !== "number") {
    throw new Error("Validation failed: missing or invalid fields");
  }
  return { id: obj["id"], email: obj["email"], age: obj["age"] };
}

// ============================================================================
// 2. Where `satisfies` Belongs (Why Zod is WRONG here)
// ============================================================================
// Rule: Use `satisfies` for in-memory, hardcoded static configurations, route tables,
// design tokens, and feature flags.
//
// Why NOT Zod here?
// 1. Performance: Zod runs validation loops at runtime; `satisfies` is 0 bytes, 0ms CPU.
// 2. Type Inference: Zod widens literal keys and unions; `satisfies` keeps exact literals.

export type ThemeColors = Record<string, string | { light: string; dark: string }>;

// ✅ ATTENTION: 'satisfies' verifies the contract at compile-time with 0 runtime JS emission,
// while allowing `theme.brand.dark` and `theme.primary.toUpperCase()` without runtime overhead!
export const appTheme = {
  primary: "#2563eb",
  secondary: "#475569",
  brand: {
    light: "#60a5fa",
    dark: "#1e40af",
  },
} satisfies ThemeColors;

// ============================================================================
// 3. The Legitimate 1% for `as Type` (Unavoidable TS Escape Hatches)
// ============================================================================

// --- Niche A: Standard Library TypeScript Limitations ---
// Object.keys(obj) returns string[] by design. `as` restores key narrowing safely.
export function getTypedObjectKeys<T extends object>(obj: T): Array<keyof T> {
  // ✅ Legitimate `as`: TypeScript's Object.keys is intentionally typed as string[]
  // because objects can have excess properties at runtime.
  return Object.keys(obj) as Array<keyof T>;
}

// --- Niche B: DOM / Host Environment APIs ---
export function setupCanvas(element: unknown): { isCanvas: boolean } {
  // In a browser environment:
  // const canvas = document.getElementById("my-canvas") as HTMLCanvasElement;
  // Zod cannot validate prototype chains of native host DOM objects.
  const isCanvas = typeof element === "object" && element !== null && "getContext" in element;
  return { isCanvas };
}

// --- Niche C: Encapsulated Generic Library Internals ---
// A generic memoize or pipe utility where TS cannot track dynamic arguments inside the helper,
// but the public interface is 100% type-safe.
export function createMemoizedFn<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const cache = new Map<string, unknown>();

  return ((...args: TArgs): TReturn => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      // ✅ Legitimate `as`: Cache invariant is maintained by the closure
      return cache.get(key) as TReturn;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as (...args: TArgs) => TReturn;
}

// --- Niche D: Partial Test Mocks / Spies ---
export interface HugeDatabaseClient {
  query(sql: string): Promise<unknown[]>;
  transaction(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  migrate(): Promise<void>;
}

export function createTestMock(): HugeDatabaseClient {
  // ✅ Legitimate in unit tests: We only care about mocking `query` for this isolated unit test.
  // Implementing all 50 database methods for a 2-line unit test creates boilerplate friction.
  const mock = {
    query: async (sql: string) => [{ id: 1, name: "Test" }],
  };
  return mock as unknown as HugeDatabaseClient;
}

// ============================================================================
// 4. Where `as const` Belongs (Single Source of Truth)
// ============================================================================
// Rule: Use `as const` when you want a JS array/object literal to generate
// your TypeScript union types without repeating yourself.

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]; // 200 | 400 | 401 | 404 | 500
