/**
 * type-level-safety.test.ts
 *
 * Automated verification of the 3 type-level safety modules:
 * - newtype.ts: Nominal branding, triple-gate validation, brand-safe math.
 * - typestate.ts: Typestate lifecycle state machine and impossible state prevention.
 * - workflow.ts: End-to-end checkout lifecycle execution.
 */

import { describe, it, expect } from "bun:test";

import {
  makeUserId,
  makeOrderId,
  makeSku,
  makeEmailAddress,
  makePositiveCents,
  makePercentageDiscount,
  isUserId,
  isOrderId,
  isPositiveCents,
  assertUserId,
  assertOrderId,
  addCents,
  applyDiscount,
  processCharge,
} from "../src/newtype.js";

import {
  Order,
  type DraftState,
  type ValidatedState,
  type PaidState,
  type ShippedState,
  type CancelledState,
} from "../src/typestate.js";

import { executeOrderLifecycle, executeCancellationLifecycle } from "../src/workflow.js";

describe("Module 1: Newtype Pattern & Nominal Branding (newtype.ts)", () => {
  it("validates and creates branded types via smart constructors", () => {
    const userId = makeUserId("  usr_alice_123  ");
    const orderId = makeOrderId("  ord_9901827  ");
    const sku = makeSku("TECH-KEYBOARD01");
    const email = makeEmailAddress("alice@example.com");
    const cents = makePositiveCents(5000);
    const discount = makePercentageDiscount(20);

    expect(String(userId)).toBe("usr_alice_123");
    expect(String(orderId)).toBe("ord_9901827");
    expect(String(sku)).toBe("TECH-KEYBOARD01");
    expect(String(email)).toBe("alice@example.com");
    expect(Number(cents)).toBe(5000);
    expect(Number(discount)).toBe(20);
  });

  it("throws on invalid inputs in smart constructors", () => {
    expect(() => makeUserId("invalid_prefix")).toThrow();
    expect(() => makeOrderId("bad_order")).toThrow();
    expect(() => makeSku("no-dash-invalid-pattern-with-too-many-dashes-here")).toThrow();
    expect(() => makeEmailAddress("invalid_email")).toThrow();
    expect(() => makePositiveCents(-500)).toThrow();
    expect(() => makePercentageDiscount(150)).toThrow();
  });

  it("narrows types via predicates and assertion functions", () => {
    expect(isUserId("usr_valid_id")).toBe(true);
    expect(isUserId("invalid_id")).toBe(false);
    expect(isOrderId("ord_valid_id")).toBe(true);
    expect(isPositiveCents(100)).toBe(true);
    expect(isPositiveCents(-50)).toBe(false);

    expect(() => assertUserId("usr_test_user")).not.toThrow();
    expect(() => assertUserId("bad_user")).toThrow();
    expect(() => assertOrderId("ord_test_order")).not.toThrow();
  });

  it("performs brand-safe arithmetic and discount calculations", () => {
    const p1 = makePositiveCents(1000);
    const p2 = makePositiveCents(2500);
    const total = addCents(p1, p2);
    expect(Number(total)).toBe(3500);

    const discounted = applyDiscount(p2, makePercentageDiscount(20)); // 2500 - 20% = 2000
    expect(Number(discounted)).toBe(2000);
  });

  it("processes charges with strict parameter order", () => {
    const uId = makeUserId("usr_bob_88");
    const oId = makeOrderId("ord_554433");
    const amount = makePositiveCents(4500);

    const res = processCharge(uId, oId, amount);
    expect(String(res.userId)).toBe("usr_bob_88");
    expect(String(res.orderId)).toBe("ord_554433");
    expect(Number(res.chargedAmount)).toBe(4500);
  });
});

describe("Module 2: Typestate Pattern & State Machine (typestate.ts)", () => {
  it("transitions order through Draft -> Validated -> Paid -> Shipped", () => {
    const orderId = makeOrderId("ord_123456");
    const userId = makeUserId("usr_carol77");
    const sku = makeSku("BOOK-TYPESCRIPT01");
    const price = makePositiveCents(6000); // $60.00

    // 1. Draft State
    const draft: Order<DraftState> = Order.create(orderId, userId)
      .addItem(sku, price, 2)
      .applyDiscount(makePercentageDiscount(10));

    expect(draft.items).toHaveLength(1);

    // 2. Validated State
    const validated: Order<ValidatedState> = draft.validate();
    expect(Number(validated.calculateTotal())).toBe(10800); // (2 * $60) - 10% = $120 - $12 = $108 (10800 cents)

    // 3. Paid State
    const paid: Order<PaidState> = validated.pay("tx_ch_99881122");
    expect(paid.payment?.transactionId).toBe("tx_ch_99881122");
    expect(Number(paid.payment?.amount)).toBe(10800);

    // 4. Shipped State
    const shipped: Order<ShippedState> = paid.ship("DHL", "TRACK_DHL_001");
    expect(shipped.shipping?.carrier).toBe("DHL");
    expect(shipped.shipping?.trackingNumber).toBe("TRACK_DHL_001");
  });

  it("allows cancellation from Draft or Validated states", () => {
    const cancelled = executeCancellationLifecycle("Customer changed mind");
    expect(cancelled.cancellationReason).toBe("Customer changed mind");
  });

  it("throws runtime error when attempting to validate empty order", () => {
    const orderId = makeOrderId("ord_empty_test");
    const userId = makeUserId("usr_dave_02");

    const draft = Order.create(orderId, userId);
    expect(() => draft.validate()).toThrow("Cannot validate an order with 0 items");
  });
});

describe("Module 3: End-to-End Workflow Pipeline (workflow.ts)", () => {
  it("executes the entire checkout lifecycle cleanly", () => {
    const result = executeOrderLifecycle();

    expect(String(result.customerId)).toBe("usr_alice99");
    expect(String(result.orderId)).toBe("ord_20260901_01");
    expect(Number(result.finalTotalCents)).toBe(114300); // ($1200 + $70) - 10% = $1270 - $127 = $1143.00 (114300 cents)
    expect(result.carrier).toBe("DHL");
    expect(result.trackingNumber).toBe("DHL-EXPRESS-99120");
  });
});
