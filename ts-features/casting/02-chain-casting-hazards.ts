/**
 * 02-chain-casting-hazards.ts
 *
 * Demonstrates why chain casting (`as unknown as TargetType`) is dangerous.
 * Highlights the 5 major runtime failure modes caused by silencing the compiler.
 */

// ============================================================================
// Model & Contract Definitions
// ============================================================================

export interface PaymentGateway {
  charge(amountCents: number): { success: boolean; transactionId: string };
  refund(transactionId: string): boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  settings: {
    notifications: {
      email: boolean;
      sms: boolean;
    };
  };
}

export interface OrderPayload {
  orderId: string;
  totalCents: number;
  placedAt: Date;
}

export class BankAccount {
  constructor(public accountNumber: string, private balanceCents: number) {}

  public getBalance(): number {
    return this.balanceCents;
  }

  public deposit(amountCents: number): void {
    if (amountCents <= 0) throw new Error("Invalid deposit amount");
    this.balanceCents += amountCents;
  }
}

// ============================================================================
// Hazard 1: The "Type Illusion" & Missing Method Crash
// ============================================================================

/**
 * Demonstrates a mock or payload that claims to be PaymentGateway via double assertion,
 * but lacks the runtime method implementation.
 */
export function simulateMissingMethodCrash(): {
  compileTimeView: string;
  errorThrown: string;
} {
  const dummyMock = {
    // ❌ FORBIDDEN: Developer forgot to implement charge() or only implemented refund()
    refund: () => true,
  };

  // ⚠️ CRITICAL: 'as unknown as PaymentGateway' silences TS2352.
  // The compiler is completely convinced that fakeGateway has .charge() and .refund().
  const fakeGateway = (dummyMock as unknown) as PaymentGateway;

  try {
    // 🔒 COMPILE-TIME: Compiles cleanly with zero type errors!
    // 💥 RUNTIME: TypeError: fakeGateway.charge is not a function
    fakeGateway.charge(2500);
    return {
      compileTimeView: "TypeScript believes fakeGateway.charge exists",
      errorThrown: "none",
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      compileTimeView: "TypeScript believed fakeGateway.charge was valid PaymentGateway",
      errorThrown: `${error.name}: ${error.message}`,
    };
  }
}

// ============================================================================
// Hazard 2: Deserialization & Nested Undefined Property Access
// ============================================================================

/**
 * Demonstrates receiving raw JSON payload from an API/database and chain-casting
 * without structural validation.
 */
export function simulateDeserializationBug(): {
  errorThrown: string;
  explanation: string;
} {
  // Raw JSON from external network boundary (notice 'settings' is missing or null)
  const rawApiJson = `{"id": "usr_404", "name": "Jane Doe"}`;
  const parsed = JSON.parse(rawApiJson);

  // ⚠️ CRITICAL: Chain casting forces TS to assume the nested object exists
  const profile = (parsed as unknown) as UserProfile;

  try {
    // 🔒 COMPILE-TIME: Compiles cleanly: profile.settings.notifications.email
    // 💥 RUNTIME: TypeError: Cannot read properties of undefined (reading 'notifications')
    const wantsEmail = profile.settings.notifications.email;
    return {
      errorThrown: "none",
      explanation: `Email preference was: ${wantsEmail}`,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      errorThrown: `${error.name}: ${error.message}`,
      explanation:
        "Chain casting deceived the compiler into allowing nested property reads on undefined objects.",
    };
  }
}

// ============================================================================
// Hazard 3: Prototype Invalidation (Plain Object vs. Class Instance)
// ============================================================================

/**
 * Demonstrates casting a plain object literal to a Class type.
 * Type assertions do NOT attach prototype methods or run class constructors!
 */
export function simulatePrototypeMismatch(): {
  errorThrown: string;
  hasPrototypeMethod: boolean;
} {
  // A plain object matching the public fields
  const plainObject = {
    accountNumber: "ACC-12345",
    balanceCents: 50000,
  };

  // ⚠️ CRITICAL: Chain casting plain object to class type BankAccount
  const account = (plainObject as unknown) as BankAccount;

  try {
    // 🔒 COMPILE-TIME: TypeScript thinks account is an instance of BankAccount
    // 💥 RUNTIME: TypeError: account.deposit is not a function (it's not in object's prototype chain)
    account.deposit(1000);
    return {
      errorThrown: "none",
      hasPrototypeMethod: true,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      errorThrown: `${error.name}: ${error.message}`,
      hasPrototypeMethod: typeof Reflect.get(account, "deposit") === "function",
    };
  }
}

// ============================================================================
// Hazard 4: Date / Primitive Coercion Failure
// ============================================================================

/**
 * Demonstrates how chain-casting raw API dates (ISO strings) to 'Date' breaks date methods.
 */
export function simulateDateCoercionBug(): {
  rawType: string;
  errorThrown: string;
} {
  const jsonPayload = `{"orderId": "ord_881", "totalCents": 12000, "placedAt": "2026-08-30T10:00:00.000Z"}`;
  const parsed = JSON.parse(jsonPayload);

  // ⚠️ CRITICAL: ISO string forced to Date via double assertion
  const order = (parsed as unknown) as OrderPayload;

  try {
    // 🔒 COMPILE-TIME: TS allows order.placedAt.getFullYear()
    // 💥 RUNTIME: TypeError: order.placedAt.getFullYear is not a function (it's a string, not Date!)
    const year = order.placedAt.getFullYear();
    return {
      rawType: typeof order.placedAt,
      errorThrown: "none",
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      rawType: typeof order.placedAt,
      errorThrown: `${error.name}: ${error.message}`,
    };
  }
}

// ============================================================================
// Hazard 5: Silent Refactoring Drift
// ============================================================================

/**
 * Demonstrates that if an interface evolves (e.g. currency fields or mandatory metadata),
 * double assertions will never fail compilation, creating zombie bugs.
 */
export function explainRefactoringDrift(): string {
  return [
    "When an interface definition changes in a codebase, `tsc` normally points to every call site that needs updating.",
    "However, every site using `as unknown as TargetType` silently swallows the compiler diagnostic.",
    "The assertion acts as a permanent blind spot that survives renames, deletions, and structural migrations.",
  ].join(" ");
}
