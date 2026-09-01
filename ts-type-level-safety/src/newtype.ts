// ============================================================================
// CONCEPT 1: THE NEWTYPE PATTERN (Branded / Nominal Types in TypeScript)
//
// In TypeScript, typing is structural (duck typing). Two types with identical
// shapes (e.g. type UserId = string vs type OrderId = string) are completely
// interchangeable, allowing accidental argument swapping without compiler errors.
//
// The Newtype pattern attaches a zero-runtime phantom brand tag to primitives,
// creating nominal type safety with zero runtime allocation overhead.
// ============================================================================

// 🔒 COMPILE-TIME: Unique phantom symbol that exists only in the type system.
// It has no JavaScript runtime representation and zero memory footprint.
declare const __brand: unique symbol;

/**
 * Attaches a nominal brand tag to an underlying primitive type `T`.
 * @template T - The primitive base type (string, number, boolean, etc.)
 * @template BrandTag - A unique literal string identifying this domain concept
 */
export type Brand<T, BrandTag extends string> = T & {
  readonly [__brand]: BrandTag;
};

// ----------------------------------------------------------------------------
// 1. DOMAIN NOMINAL TYPES (Defined with unique brand tags)
// ----------------------------------------------------------------------------

export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type Sku = Brand<string, "Sku">;
export type EmailAddress = Brand<string, "EmailAddress">;

export type PositiveCents = Brand<number, "PositiveCents">;
export type PercentageDiscount = Brand<number, "PercentageDiscount">;

// ----------------------------------------------------------------------------
// 2. SMART CONSTRUCTORS (The Gated Factories for Branded Values)
// ----------------------------------------------------------------------------

/**
 * Validates and creates a strongly-typed `UserId`.
 * ✅ ATTENTION: Smart constructors are the ONLY legitimate gateway to create branded values.
 */
export function makeUserId(raw: string): UserId {
  const trimmed = raw.trim();
  // ⚠️ CRITICAL: Enforce domain invariants before type branding
  if (!trimmed.startsWith("usr_") || trimmed.length < 8) {
    throw new Error(`[Invariant Violation] Invalid UserId format: '${raw}'. Must start with 'usr_' and be >= 8 chars.`);
  }
  // 🔒 COMPILE-TIME: Controlled assertion to branded type after validation passes
  return trimmed as UserId;
}

/**
 * Validates and creates a strongly-typed `OrderId`.
 */
export function makeOrderId(raw: string): OrderId {
  const trimmed = raw.trim();
  // ⚠️ CRITICAL: Enforce domain invariants
  if (!trimmed.startsWith("ord_") || trimmed.length < 8) {
    throw new Error(`[Invariant Violation] Invalid OrderId format: '${raw}'. Must start with 'ord_' and be >= 8 chars.`);
  }
  return trimmed as OrderId;
}

/**
 * Validates and creates a strongly-typed `Sku` (Stock Keeping Unit).
 */
export function makeSku(raw: string): Sku {
  const trimmed = raw.trim().toUpperCase();
  // ⚠️ CRITICAL: Validate SKU alphanumeric pattern (e.g. "PROD-1024")
  if (!/^[A-Z0-9]+-[A-Z0-9]+$/.test(trimmed)) {
    throw new Error(`[Invariant Violation] Invalid Sku format: '${raw}'. Expected pattern 'CAT-NUM' (e.g. 'ELEC-9021').`);
  }
  return trimmed as Sku;
}

/**
 * Validates and creates a strongly-typed `EmailAddress`.
 */
export function makeEmailAddress(raw: string): EmailAddress {
  const trimmed = raw.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // ⚠️ CRITICAL: Enforce valid email format
  if (!emailRegex.test(trimmed)) {
    throw new Error(`[Invariant Violation] Invalid EmailAddress: '${raw}'.`);
  }
  return trimmed as EmailAddress;
}

/**
 * Validates and creates a positive integer representing monetary cents.
 * Prevents fractional currency, negative pricing, and NaN/Infinity bugs.
 */
export function makePositiveCents(amount: number): PositiveCents {
  // ⚠️ CRITICAL: Money must be an integer (cents) > 0
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`[Invariant Violation] PositiveCents must be a positive integer in cents. Received: ${amount}`);
  }
  return amount as PositiveCents;
}

/**
 * Validates and creates a percentage discount (0 to 100 inclusive).
 */
export function makePercentageDiscount(percent: number): PercentageDiscount {
  // ⚠️ CRITICAL: Discount range validation
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error(`[Invariant Violation] PercentageDiscount must be between 0 and 100. Received: ${percent}`);
  }
  return percent as PercentageDiscount;
}

// ----------------------------------------------------------------------------
// 3. BRAND-SAFE DOMAIN OPERATIONS (Calculations preserving brand invariants)
// ----------------------------------------------------------------------------

/**
 * Adds two PositiveCents values, producing a valid PositiveCents result.
 * ✅ ATTENTION: Operations on branded types return branded types if invariant holds.
 */
export function addCents(a: PositiveCents, b: PositiveCents): PositiveCents {
  return (a + b) as PositiveCents;
}

/**
 * Calculates a discounted price, rounding down to nearest cent.
 */
export function applyDiscount(price: PositiveCents, discount: PercentageDiscount): PositiveCents {
  const factor = (100 - discount) / 100;
  const discounted = Math.max(1, Math.floor(price * factor));
  return discounted as PositiveCents;
}

// ----------------------------------------------------------------------------
// 4. DEMO: PREVENTING PRIMITIVE OBSESSION & ARGUMENT SWAPPING
// ----------------------------------------------------------------------------

export interface ChargeResult {
  userId: UserId;
  orderId: OrderId;
  chargedAmount: PositiveCents;
  receiptNumber: string;
}

/**
 * Charges a customer order.
 * 🔒 COMPILE-TIME: The compiler guarantees arguments cannot be swapped!
 */
export function processCharge(
  userId: UserId,
  orderId: OrderId,
  amount: PositiveCents
): ChargeResult {
  // ✅ ATTENTION: Pure type-safe execution. No defensive typeof runtime checks needed!
  return {
    userId,
    orderId,
    chargedAmount: amount,
    receiptNumber: `rcpt_${Math.random().toString(36).slice(2, 9)}`,
  };
}
