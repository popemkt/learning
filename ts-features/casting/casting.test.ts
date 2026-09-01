/**
 * casting.test.ts
 *
 * Automated verification test suite for TypeScript casting mechanics,
 * chain casting runtime hazards, and safe alternative patterns.
 */

import { describe, it, expect } from "bun:test";

import {
  demonstrateUpcasting,
  demonstrateDowncasting,
  explainOverlapRule,
  demonstrateTypeErasure,
} from "./01-type-assertion-mechanics";

import {
  simulateMissingMethodCrash,
  simulateDeserializationBug,
  simulatePrototypeMismatch,
  simulateDateCoercionBug,
} from "./02-chain-casting-hazards";

import {
  isUserProfile,
  parseOrderPayload,
  mapDtoToBankAccount,
  formatPaymentDetails,
  demonstrateSatisfies,
  demonstrateConstAssertion,
  PaymentMethod,
} from "./03-safe-alternatives";

import {
  demonstratePaletteSafety,
  demonstrateTypoCatching,
  getRoute,
  appRoutes,
  activeFlags,
} from "./04-as-vs-satisfies";
import {
  validateRuntimeBoundary,
  appTheme,
  getTypedObjectKeys,
  createMemoizedFn,
  createTestMock,
  HTTP_STATUS,
} from "./05-when-to-use-what";

import {
  mockContract,
  ESLINT_RULES_CONFIG,
} from "./06-prevention-and-lint-rules";
describe("TypeScript Type Assertion Mechanics", () => {
  it("should preserve underlying runtime properties when upcasting", () => {
    const { original, asserted } = demonstrateUpcasting();
    expect(asserted.id).toBe("usr_9981");
    // At runtime, JavaScript object is untouched:
    expect(Reflect.get(asserted, "role")).toBe("admin");
    expect(Reflect.get(asserted, "email")).toBe("root@example.com");
  });

  it("should allow downcasting at compile-time without runtime validation", () => {
    const downcast = demonstrateDowncasting({ id: "usr_123" });
    expect(downcast.id).toBe("usr_123");
    // Downcasting does NOT supply missing fields:
    expect(downcast.email).toBeUndefined();
    expect(downcast.role).toBeUndefined();
  });

  it("should verify type erasure produces zero runtime type conversion", () => {
    const { input, runtimeType } = demonstrateTypeErasure();
    expect(input).toBe("12345");
    // 'as number' does not change string to number at runtime:
    expect(runtimeType).toBe("string");
  });

  it("should confirm the overlap rule semantics", () => {
    const rule = explainOverlapRule();
    expect(rule.overlappingAllowed).toBe(true);
    expect(rule.disjointRejected).toBe(true);
  });
});

describe("Chain Casting Hazards (as unknown as T)", () => {
  it("Hazard 1: should throw TypeError when invoking missing method on fake mock", () => {
    const result = simulateMissingMethodCrash();
    expect(result.errorThrown).toContain("TypeError");
  });

  it("Hazard 2: should throw TypeError when accessing nested property on unvalidated deserialized payload", () => {
    const result = simulateDeserializationBug();
    expect(result.errorThrown).toContain("TypeError");
    expect(result.errorThrown).toContain("notifications");
  });

  it("Hazard 3: should throw TypeError when invoking class methods on plain object cast to class", () => {
    const result = simulatePrototypeMismatch();
    expect(result.errorThrown).toContain("TypeError");
    expect(result.hasPrototypeMethod).toBe(false);
  });

  it("Hazard 4: should throw TypeError when invoking Date methods on ISO string cast to Date", () => {
    const result = simulateDateCoercionBug();
    expect(result.rawType).toBe("string");
    expect(result.errorThrown).toContain("TypeError");
  });
});

describe("Safe Production Alternatives", () => {
  it("Alternative 1: User-Defined Type Guard should correctly validate and reject shapes", () => {
    const valid = {
      id: "usr_200",
      name: "Alice",
      settings: { notifications: { email: true, sms: false } },
    };
    const invalid = { id: "usr_201", name: "Bob", settings: null };

    expect(isUserProfile(valid)).toBe(true);
    expect(isUserProfile(invalid)).toBe(false);
    expect(isUserProfile("invalid-primitive")).toBe(false);
    expect(isUserProfile(null)).toBe(false);
  });

  it("Alternative 2: Schema Parser should transform and validate valid order payload", () => {
    const raw = {
      orderId: "ord_100",
      totalCents: 2500,
      placedAt: "2026-08-30T10:15:00.000Z",
    };
    const result = parseOrderPayload(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderId).toBe("ord_100");
      expect(result.data.totalCents).toBe(2500);
      expect(result.data.placedAt).toBeInstanceOf(Date);
      expect(result.data.placedAt.toISOString()).toBe("2026-08-30T10:15:00.000Z");
    }
  });

  it("Alternative 2: Schema Parser should catch all malformed fields defensively", () => {
    const malformed = {
      orderId: "",
      totalCents: -10,
      placedAt: "not-a-valid-date",
    };
    const result = parseOrderPayload(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBe(3);
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("orderId");
      expect(paths).toContain("totalCents");
      expect(paths).toContain("placedAt");
    }
  });

  it("Alternative 3: Domain Entity Mapper should instantiate BankAccount with prototype methods", () => {
    const account = mapDtoToBankAccount({
      account_number: "ACC-5544",
      initial_balance_cents: 20000,
    });
    expect(account.getBalance()).toBe(20000);
    account.deposit(5000);
    expect(account.getBalance()).toBe(25000);
  });

  it("Alternative 4: Discriminated Unions should format all union variants exhaustively", () => {
    const cc: PaymentMethod = {
      kind: "CREDIT_CARD",
      cardNumberMasked: "4111",
      expiryMonth: 12,
      expiryYear: 2028,
    };
    const bank: PaymentMethod = {
      kind: "BANK_TRANSFER",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
    };
    const crypto: PaymentMethod = {
      kind: "CRYPTO_WALLET",
      address: "0x123...abc",
      network: "ETH",
    };

    expect(formatPaymentDetails(cc)).toContain("Credit Card");
    expect(formatPaymentDetails(bank)).toContain("Bank Transfer");
    expect(formatPaymentDetails(crypto)).toContain("Crypto (ETH Wallet");
  });

  it("Alternative 5: satisfies operator should preserve literal types", () => {
    const res = demonstrateSatisfies();
    expect(res.pathExactLiteral).toBe("/api/health");
    expect(res.methodExactLiteral).toBe("GET");
  });

  it("Alternative 6: as const should create readonly literal constants", () => {
    const res = demonstrateConstAssertion();
    expect(res.rolesCount).toBe(4);
    expect(res.isReadonly).toBe(true);
    expect(res.endpoint).toBe("/api/v1/users");
  });
});

describe("as vs. satisfies Operator Comparison", () => {
  it("satisfies preserves exact member types in union dictionaries", () => {
    const res = demonstratePaletteSafety();
    expect(res.primaryUpper).toBe("#3B82F6");
    expect(res.accentRedChannel).toBe(255);
  });

  it("satisfies validates contracts and catches typos", () => {
    const res = demonstrateTypoCatching();
    expect(res.satisfiesCatchesErrors).toBe(true);
    expect(res.asMasksErrors).toBe(true);
  });

  it("satisfies preserves exact object keys for autocomplete and lookup", () => {
    expect(getRoute("home")).toBe("/");
    expect(getRoute("dashboard")).toBe("/dashboard");
    expect(appRoutes.home.requiresAuth).toBe(false);
  });

  it("as const satisfies guarantees immutable contract adherence", () => {
    expect(activeFlags.ENABLE_NEW_CHECKOUT).toBe(true);
    expect(activeFlags.ALLOWED_DOMAINS[0]).toBe("example.com");
  });
});

describe("When to Use What (Decision Framework)", () => {
  it("Zod / Schema Validation should parse valid data and reject invalid runtime payloads", () => {
    const valid = validateRuntimeBoundary({ id: "u_1", email: "a@b.com", age: 30 });
    expect(valid.id).toBe("u_1");
    expect(valid.age).toBe(30);

    expect(() => validateRuntimeBoundary({ id: "u_1" })).toThrow();
  });

  it("satisfies validates in-memory theme tokens without losing property access", () => {
    expect(appTheme.primary.toUpperCase()).toBe("#2563EB");
    expect(appTheme.brand.dark).toBe("#1e40af");
  });

  it("as Type safely bridges TS standard library limitations like Object.keys", () => {
    const sample = { a: 1, b: "two" };
    const keys = getTypedObjectKeys(sample);
    expect(keys).toContain("a");
    expect(keys).toContain("b");
  });

  it("as Type enables encapsulated generic utility closures", () => {
    let calls = 0;
    const double = createMemoizedFn((x: number) => {
      calls++;
      return x * 2;
    });
    expect(double(5)).toBe(10);
    expect(double(5)).toBe(10);
    expect(calls).toBe(1); // Cached
  });

  it("as Type enables isolated unit test doubles without mocking unneeded APIs", async () => {
    const mockDb = createTestMock();
    const results = await mockDb.query("SELECT * FROM users");
    expect(results.length).toBe(1);
  });

  it("as const generates accurate literal union types", () => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);
  });
});

describe("Automated Prevention & Mocking Guards", () => {
  it("mockContract provides safe partial mocking and throws on unmocked calls", () => {
    interface Service {
      getId(): string;
      sendEmail(to: string): Promise<boolean>;
    }

    const mock = mockContract<Service>({
      getId: () => "mock_123",
    });

    expect(mock.getId()).toBe("mock_123");
    expect(() => mock.sendEmail("test@example.com")).toThrow("Unmocked property or method 'sendEmail'");
  });

  it("verifies ESLint rule configuration covers key assertion anti-patterns", () => {
    const consistentRule = ESLINT_RULES_CONFIG["@typescript-eslint/consistent-type-assertions"];
    expect(consistentRule[0]).toBe("error");
    expect(consistentRule[1]?.objectLiteralTypeAssertions).toBe("never");
    expect(ESLINT_RULES_CONFIG["@typescript-eslint/no-unnecessary-type-assertion"]).toBe("error");
    expect(ESLINT_RULES_CONFIG["no-restricted-syntax"]?.length).toBeGreaterThan(0);
  });
});
