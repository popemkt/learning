// ============================================================================
// CONCEPT 1: ADVANCED TYPE-LEVEL NEWTYPE PATTERN IN TYPESCRIPT
//
// Combines:
// 1. Phantom Unique Symbol Branding (Nominal type separation)
// 2. Template Literal Types (Compile-time shape checking for literals)
// 3. Type-Level Number Filters (Compile-time rejection of negative/float numbers)
// 4. The "Triple Gate" Validation Architecture:
//    - Predicates: isX(val): val is X (Non-throwing, filter-safe)
//    - Assertion Functions: assertX(val): asserts val is X (In-place flow narrowing)
//    - Smart Constructors: makeX(val): X (Sanitizes, validates, returns brand)
// ============================================================================

// 🔒 COMPILE-TIME: Unique phantom symbol that exists only in the type system.
// It has no JavaScript runtime representation and zero memory footprint.
declare const __brand: unique symbol;

/**
 * Attaches a nominal brand tag to an underlying base type `T`.
 * @template T - The base type (string, number, template literal, etc.)
 * @template BrandTag - A unique literal string identifying this domain concept
 */
export type Brand<T, BrandTag extends string> = T & {
  readonly [__brand]: BrandTag;
};

// ----------------------------------------------------------------------------
// 1. TEMPLATE LITERAL PATTERNS + NOMINAL BRANDING
// ----------------------------------------------------------------------------
// ✅ ATTENTION: By combining Template Literals with Branding:
// - String literals (e.g. "usr_1024") are checked AT COMPILE-TIME!
// - Dynamic strings (from API / DB) are gated by runtime Smart Constructors / Asserts.

export type UserIdPattern = `usr_${string}`;
export type OrderIdPattern = `ord_${string}`;
export type SkuPattern = `${string}-${string}`;
export type EmailPattern = `${string}@${string}.${string}`;
export type HexColorPattern = `#${string}`;

export type UserId = Brand<UserIdPattern, "UserId">;
export type OrderId = Brand<OrderIdPattern, "OrderId">;
export type Sku = Brand<SkuPattern, "Sku">;
export type EmailAddress = Brand<EmailPattern, "EmailAddress">;
export type HexColor = Brand<HexColorPattern, "HexColor">;

export type PositiveCents = Brand<number, "PositiveCents">;
export type PercentageDiscount = Brand<number, "PercentageDiscount">;

// ----------------------------------------------------------------------------
// 2. TYPE-LEVEL NUMBER CONSTRAINTS (Compile-Time Filter for Number Literals)
// ----------------------------------------------------------------------------

/**
 * 🔒 COMPILE-TIME: Inspects number literal string representations.
 * Rejects negative numbers, zero, and floating-point values at compile time!
 */
export type PositiveInt<T extends number> =
  `${T}` extends `-${string}` | "0" | `${string}.${string}`
    ? never
    : T;

/**
 * 🔒 COMPILE-TIME: Validates percentage discount integers (0 to 100).
 */
export type PercentageInt<T extends number> =
  `${T}` extends `-${string}` | `${string}.${string}`
    ? never
    : T;

// ----------------------------------------------------------------------------
// 3. THE "TRIPLE GATE" VALIDATION ARCHITECTURE
// ----------------------------------------------------------------------------
//
// In production TypeScript architectures, you need 3 distinct ways to validate:
//
// | Gate Type | Signature | When to Use | Trade-offs |
// | :--- | :--- | :--- | :--- |
// | **1. Predicate** | `isX(val): val is X` | Array filtering (`arr.filter(isX)`), boolean branching (`if (isX)`) | Non-throwing; does not sanitize data. |
// | **2. Assertion** | `assertX(val): asserts val is X` | Express/Fastify request middleware, unit tests, fast-fail pipelines | Narrows in-place without reassignment; cannot sanitize data. |
// | **3. Smart Constructor** | `makeX(val): X` | External ingestion (Forms, JSON payloads, CLI args) | Trims, normalizes, sanitizes, and returns a new branded value. |

// === GATE 1: PREDICATES (Non-throwing type guards) ===

export function isUserId(val: unknown): val is UserId {
  return typeof val === "string" && val.startsWith("usr_") && val.length >= 8;
}

export function isOrderId(val: unknown): val is OrderId {
  return typeof val === "string" && val.startsWith("ord_") && val.length >= 8;
}

export function isPositiveCents(val: unknown): val is PositiveCents {
  return typeof val === "number" && Number.isSafeInteger(val) && val > 0;
}

export function isPercentageDiscount(val: unknown): val is PercentageDiscount {
  return typeof val === "number" && Number.isFinite(val) && val >= 0 && val <= 100;
}

// === GATE 2: ASSERTION FUNCTIONS (In-place flow narrowing) ===

/**
 * Asserts that a value is a valid `UserId`.
 * ✅ ATTENTION: Once called, TypeScript narrows the variable for the entire rest of the function!
 */
export function assertUserId(val: unknown): asserts val is UserId {
  if (!isUserId(val)) {
    throw new Error(`[Invariant Violation] Expected UserId ('usr_*', >=8 chars), received: ${String(val)}`);
  }
}

/**
 * Asserts that a value is a valid `OrderId`.
 */
export function assertOrderId(val: unknown): asserts val is OrderId {
  if (!isOrderId(val)) {
    throw new Error(`[Invariant Violation] Expected OrderId ('ord_*', >=8 chars), received: ${String(val)}`);
  }
}

/**
 * Asserts that a value is a valid `PositiveCents`.
 */
export function assertPositiveCents(val: unknown): asserts val is PositiveCents {
  if (!isPositiveCents(val)) {
    throw new Error(`[Invariant Violation] Expected positive integer in cents (> 0), received: ${String(val)}`);
  }
}

/**
 * Asserts that a value is a valid `PercentageDiscount`.
 */
export function assertPercentageDiscount(val: unknown): asserts val is PercentageDiscount {
  if (!isPercentageDiscount(val)) {
    throw new Error(`[Invariant Violation] Expected percentage between 0 and 100, received: ${String(val)}`);
  }
}

// === GATE 3: SMART CONSTRUCTORS (Sanitization + Validation) ===

/**
 * Sanitizes and creates a strongly-typed `UserId`.
 * ⚠️ CRITICAL: Smart constructors sanitize input (e.g. trim whitespace) before branding.
 */
export function makeUserId(raw: string): UserId {
  const trimmed = raw.trim();
  assertUserId(trimmed);
  return trimmed;
}

/**
 * Sanitizes and creates a strongly-typed `OrderId`.
 */
export function makeOrderId(raw: string): OrderId {
  const trimmed = raw.trim();
  assertOrderId(trimmed);
  return trimmed;
}

/**
 * Sanitizes and creates a strongly-typed `Sku` (e.g. "ELEC-9001").
 */
export function makeSku(raw: string): Sku {
  const trimmed = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]+-[A-Z0-9]+$/.test(trimmed)) {
    throw new Error(`[Invariant Violation] Invalid Sku format: '${raw}'. Expected pattern 'CAT-NUM' (e.g. 'ELEC-9021').`);
  }
  return trimmed as Sku;
}

/**
 * Sanitizes and creates a strongly-typed `EmailAddress`.
 */
export function makeEmailAddress(raw: string): EmailAddress {
  const trimmed = raw.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error(`[Invariant Violation] Invalid EmailAddress: '${raw}'.`);
  }
  return trimmed as EmailAddress;
}

/**
 * Validates and creates a positive integer representing monetary cents.
 */
export function makePositiveCents(amount: number): PositiveCents {
  assertPositiveCents(amount);
  return amount;
}

/**
 * Validates and creates a percentage discount (0 to 100).
 */
export function makePercentageDiscount(percent: number): PercentageDiscount {
  assertPercentageDiscount(percent);
  return percent;
}

// ----------------------------------------------------------------------------
// 4. BRAND-SAFE DOMAIN OPERATIONS
// ----------------------------------------------------------------------------

export function addCents(a: PositiveCents, b: PositiveCents): PositiveCents {
  return (a + b) as PositiveCents;
}

export function applyDiscount(price: PositiveCents, discount: PercentageDiscount): PositiveCents {
  const factor = (100 - discount) / 100;
  const discounted = Math.max(1, Math.floor(price * factor));
  return discounted as PositiveCents;
}

// ----------------------------------------------------------------------------
// 5. DEMO: PREVENTING PRIMITIVE OBSESSION & ARGUMENT SWAPPING
// ----------------------------------------------------------------------------

export interface ChargeResult {
  userId: UserId;
  orderId: OrderId;
  chargedAmount: PositiveCents;
  receiptNumber: string;
}

export function processCharge(
  userId: UserId,
  orderId: OrderId,
  amount: PositiveCents
): ChargeResult {
  return {
    userId,
    orderId,
    chargedAmount: amount,
    receiptNumber: `rcpt_${Math.random().toString(36).slice(2, 9)}`,
  };
}

/**
 * Demonstrates type-level compile-time number gating for literal values.
 */
export function createVerifiedPrice<T extends number>(cents: PositiveInt<T>): PositiveCents {
  return cents as unknown as PositiveCents;
}
