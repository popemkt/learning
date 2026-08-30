/**
 * 03-safe-alternatives.ts
 *
 * Demonstrates robust, production-grade alternatives to chain casting:
 * 1. User-Defined Type Predicates (`x is T`)
 * 2. Schema Validation / "Parse, Don't Validate"
 * 3. Domain Entity Mappers & Factory Constructors
 * 4. Discriminated Unions with Exhaustiveness Checking (`never`)
 * 5. The `satisfies` Operator
 * 6. Const Assertions (`as const`)
 */

import { UserProfile, OrderPayload, BankAccount } from "./02-chain-casting-hazards";

// ============================================================================
// 1. User-Defined Type Predicates (`x is T`)
// ============================================================================

/**
 * Validates at runtime whether an unknown input matches the UserProfile interface.
 * When this function returns true, TypeScript safely narrows the type in that branch.
 */
export function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // ✅ ATTENTION: Verify all mandatory root fields
  if (typeof obj["id"] !== "string" || typeof obj["name"] !== "string") {
    return false;
  }

  // ✅ ATTENTION: Validate nested structure defensively
  const settings = obj["settings"];
  if (typeof settings !== "object" || settings === null) {
    return false;
  }

  const notifications = (settings as Record<string, unknown>)["notifications"];
  if (typeof notifications !== "object" || notifications === null) {
    return false;
  }

  const notifObj = notifications as Record<string, unknown>;
  return (
    typeof notifObj["email"] === "boolean" &&
    typeof notifObj["sms"] === "boolean"
  );
}

// ============================================================================
// 2. Schema Validation & "Parse, Don't Validate" Pattern
// ============================================================================

export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; errors: E[] };

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Parses raw unvalidated input into a verified OrderPayload.
 * Guarantees that dates are actual Date objects and numbers are valid amounts.
 */
export function parseOrderPayload(raw: unknown): Result<OrderPayload, ValidationError> {
  const errors: ValidationError[] = [];

  if (typeof raw !== "object" || raw === null) {
    return {
      success: false,
      errors: [{ path: "root", message: "Payload must be a non-null object" }],
    };
  }

  const obj = raw as Record<string, unknown>;

  // Validate orderId
  if (typeof obj["orderId"] !== "string" || obj["orderId"].trim() === "") {
    errors.push({ path: "orderId", message: "Expected non-empty string" });
  }

  // Validate totalCents
  if (
    typeof obj["totalCents"] !== "number" ||
    !Number.isSafeInteger(obj["totalCents"]) ||
    obj["totalCents"] < 0
  ) {
    errors.push({ path: "totalCents", message: "Expected non-negative integer cents" });
  }

  // Parse and validate date string to actual Date instance
  let parsedDate: Date | undefined;
  if (typeof obj["placedAt"] === "string") {
    const timestamp = Date.parse(obj["placedAt"]);
    if (Number.isNaN(timestamp)) {
      errors.push({ path: "placedAt", message: "Invalid ISO date string" });
    } else {
      parsedDate = new Date(timestamp);
    }
  } else if (obj["placedAt"] instanceof Date && !Number.isNaN(obj["placedAt"].getTime())) {
    parsedDate = obj["placedAt"];
  } else {
    errors.push({ path: "placedAt", message: "Expected ISO date string or Date instance" });
  }

  if (errors.length > 0 || !parsedDate || typeof obj["orderId"] !== "string" || typeof obj["totalCents"] !== "number") {
    return { success: false, errors };
  }

  // ✅ ATTENTION: Return freshly constructed, verified domain model
  return {
    success: true,
    data: {
      orderId: obj["orderId"],
      totalCents: obj["totalCents"],
      placedAt: parsedDate,
    },
  };
}

// ============================================================================
// 3. Domain Entity Mappers & Factory Constructors
// ============================================================================

export interface RawAccountDto {
  account_number: string;
  initial_balance_cents: number;
}

/**
 * Creates genuine BankAccount class instances from external DTOs,
 * guaranteeing prototype methods and encapsulation invariants.
 */
export function mapDtoToBankAccount(dto: RawAccountDto): BankAccount {
  // ✅ ATTENTION: Explicit constructor invocation guarantees prototype methods exist
  if (!dto.account_number || dto.initial_balance_cents < 0) {
    throw new Error(`Invalid account DTO: ${JSON.stringify(dto)}`);
  }
  return new BankAccount(dto.account_number, dto.initial_balance_cents);
}

// ============================================================================
// 4. Discriminated Unions & Exhaustiveness Checking
// ============================================================================

export type PaymentMethod =
  | { kind: "CREDIT_CARD"; cardNumberMasked: string; expiryMonth: number; expiryYear: number }
  | { kind: "BANK_TRANSFER"; iban: string; bic: string }
  | { kind: "CRYPTO_WALLET"; address: string; network: "ETH" | "BTC" | "SOL" };

export function formatPaymentDetails(method: PaymentMethod): string {
  // ✅ ATTENTION: TypeScript automatically narrows 'method' inside each case
  switch (method.kind) {
    case "CREDIT_CARD":
      return `Credit Card (ending ${method.cardNumberMasked}, exp ${method.expiryMonth}/${method.expiryYear})`;
    case "BANK_TRANSFER":
      return `Bank Transfer (IBAN: ${method.iban}, BIC: ${method.bic})`;
    case "CRYPTO_WALLET":
      return `Crypto (${method.network} Wallet: ${method.address})`;
    default: {
      // 🔒 COMPILE-TIME: The compiler will fail here if a new payment method is added to union
      // but omitted from the switch!
      const _exhaustiveCheck: never = method;
      throw new Error(`Unhandled payment method: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

// ============================================================================
// 5. The `satisfies` Operator vs. Type Assertions
// ============================================================================

export interface RouteConfig {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  rateLimit?: { maxRequests: number; windowSeconds: number };
}

export function demonstrateSatisfies(): {
  pathExactLiteral: string;
  methodExactLiteral: string;
} {
  // ✅ ATTENTION: 'satisfies' verifies that the object matches RouteConfig,
  // but DOES NOT widen 'GET' to 'string' or the path to generic 'string'.
  const healthRoute = {
    path: "/api/health",
    method: "GET",
  } satisfies RouteConfig;

  // 🔒 COMPILE-TIME: 'healthRoute.method' retains the literal type "GET" (not widened to string union)
  return {
    pathExactLiteral: healthRoute.path,
    methodExactLiteral: healthRoute.method,
  };
}

// ============================================================================
// 6. Const Assertions (`as const`)
// ============================================================================

export const APPLICATION_ROLES = ["SUPERADMIN", "ADMIN", "EDITOR", "VIEWER"] as const;
export type ApplicationRole = (typeof APPLICATION_ROLES)[number];

export const API_ENDPOINTS = {
  USERS: "/api/v1/users",
  ORDERS: "/api/v1/orders",
  PAYMENTS: "/api/v1/payments",
} as const;

export function demonstrateConstAssertion(): {
  rolesCount: number;
  isReadonly: boolean;
  endpoint: string;
} {
  // ✅ ATTENTION: 'as const' marks all array elements and object properties readonly literals.
  // This prevents accidental runtime mutations and produces exact literal union types.
  return {
    rolesCount: APPLICATION_ROLES.length,
    isReadonly: true,
    endpoint: API_ENDPOINTS.USERS,
  };
}
