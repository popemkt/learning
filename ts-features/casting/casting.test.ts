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
