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
  isPercentageDiscount,
  assertUserId,
  assertOrderId,
  assertPositiveCents,
  assertPercentageDiscount,
  createVerifiedPrice,
  addCents,
  applyDiscount,
  processCharge,
  type UserId,
  type OrderId,
  type Sku,
  type EmailAddress,
  type PositiveCents,
  type PositiveInt,
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

// ----------------------------------------------------------------------------
// TYPE-LEVEL TESTING HELPERS (Asserts compiler types at build time)
// ----------------------------------------------------------------------------
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

describe("Concept 1: Advanced Newtype & Triple Gate Validation", () => {
  it("creates valid branded UserId and rejects malformed strings", () => {
    const validUser = makeUserId("usr_charlie");
    expect(validUser).toBe("usr_charlie" as UserId);

    // 🔒 COMPILE-TIME: Assert UserId brand exists
    type _TypeCheck = Expect<Equal<typeof validUser, UserId>>;

    // ⚠️ CRITICAL: Invariant violation checks
    expect(() => makeUserId("invalid_prefix")).toThrow(/Expected UserId/);
    expect(() => makeUserId("usr_1")).toThrow(/Expected UserId/);
  });

  it("creates valid OrderId and enforces format invariants", () => {
    const validOrder = makeOrderId("ord_99001122");
    expect(validOrder).toBe("ord_99001122" as OrderId);

    expect(() => makeOrderId("ord_1")).toThrow(/Expected OrderId/);
    expect(() => makeOrderId("wrong_prefix_1234")).toThrow(/Expected OrderId/);
  });

  it("creates valid Sku and enforces uppercase alphanumeric pattern", () => {
    const sku = makeSku("tech-gpu3080");
    expect(sku).toBe("TECH-GPU3080" as Sku);

    expect(() => makeSku("badsku")).toThrow(/Invalid Sku format/);
    expect(() => makeSku("12345")).toThrow(/Invalid Sku format/);
  });

  it("creates valid EmailAddress and rejects invalid formats", () => {
    const email = makeEmailAddress("Alice.Smith@Example.COM");
    expect(email).toBe("alice.smith@example.com" as EmailAddress);

    expect(() => makeEmailAddress("not-an-email")).toThrow(/Invalid EmailAddress/);
    expect(() => makeEmailAddress("missing@domain")).toThrow(/Invalid EmailAddress/);
  });

  it("creates PositiveCents and rejects negative, float, and zero amounts", () => {
    const cents = makePositiveCents(1599); // $15.99
    expect(cents).toBe(1599 as PositiveCents);

    expect(() => makePositiveCents(0)).toThrow(/Expected positive integer in cents/);
    expect(() => makePositiveCents(-500)).toThrow(/Expected positive integer in cents/);
    expect(() => makePositiveCents(12.5)).toThrow(/Expected positive integer in cents/);
  });

  it("validates data non-throwingly with Predicates (Gate 1)", () => {
    expect(isUserId("usr_valid123")).toBe(true);
    expect(isUserId("bad_prefix")).toBe(false);
    expect(isUserId(12345)).toBe(false);

    expect(isOrderId("ord_valid123")).toBe(true);
    expect(isOrderId("ord_short")).toBe(true); // 9 chars >= 8

    expect(isPositiveCents(100)).toBe(true);
    expect(isPositiveCents(0)).toBe(false);
    expect(isPositiveCents(-50)).toBe(false);
    expect(isPositiveCents(12.34)).toBe(false);

    expect(isPercentageDiscount(50)).toBe(true);
    expect(isPercentageDiscount(105)).toBe(false);
    expect(isPercentageDiscount(-1)).toBe(false);
  });

  it("narrows types in-place with Assertion Functions (Gate 2)", () => {
    const rawUserId: unknown = "usr_narrowed99";

    // Before assertion: type is unknown
    expect(() => {
      // @ts-expect-error - rawUserId is unknown before assertion
      const _len = rawUserId.length;
    }).not.toThrow();

    // In-place narrowing gate
    assertUserId(rawUserId);

    // 🔒 COMPILE-TIME: TypeScript automatically narrows rawUserId to UserId in place!
    const _narrowedCheck: UserId = rawUserId;
    expect(_narrowedCheck).toBe("usr_narrowed99" as UserId);

    expect(() => assertUserId("bad_user")).toThrow(/Expected UserId/);
    expect(() => assertPositiveCents(-100)).toThrow(/Expected positive integer in cents/);
    expect(() => assertPercentageDiscount(120)).toThrow(/Expected percentage between 0 and 100/);
  });

  it("enforces type-level number constraints with PositiveInt<T>", () => {
    // 🔒 COMPILE-TIME: Positive literal compiles
    const price = createVerifiedPrice(4500);
    expect(price).toBe(4500 as PositiveCents);

    // 🔒 COMPILE-TIME TYPE CHECKS:
    type _PositiveCheck = Expect<Equal<PositiveInt<50>, 50>>;
    type _NegativeCheck = Expect<Equal<PositiveInt<-50>, never>>;
    type _ZeroCheck = Expect<Equal<PositiveInt<0>, never>>;
    type _FloatCheck = Expect<Equal<PositiveInt<12.5>, never>>;
  });

  it("performs brand-safe arithmetic with addCents and applyDiscount", () => {
    const priceA = makePositiveCents(2000);
    const priceB = makePositiveCents(3000);
    const total = addCents(priceA, priceB);

    expect(total).toBe(5000 as PositiveCents);

    const discount = makePercentageDiscount(20); // 20% off
    const discounted = applyDiscount(total, discount);
    expect(discounted).toBe(4000 as PositiveCents);
  });

  it("processes charges with processCharge without runtime type checking", () => {
    const user = makeUserId("usr_david123");
    const order = makeOrderId("ord_sale_5544");
    const amount = makePositiveCents(8500);

    const charge = processCharge(user, order, amount);
    expect(charge.userId).toBe(user);
    expect(charge.orderId).toBe(order);
    expect(charge.chargedAmount).toBe(amount);
    expect(charge.receiptNumber.startsWith("rcpt_")).toBe(true);
  });
});

describe("Concept 2: Typestate Pattern (Compile-Time State Machines)", () => {
  it("enforces order creation in DraftState and allows item addition", () => {
    const user = makeUserId("usr_eve2026");
    const orderId = makeOrderId("ord_cart_001");
    const sku = makeSku("PROD-KEYBOARD");
    const price = makePositiveCents(7500);

    const draft = Order.create(orderId, user).addItem(sku, price, 1);

    expect(draft.items.length).toBe(1);
    expect(draft.items[0].sku).toBe(sku);

    // 🔒 COMPILE-TIME: Verify draft has DraftState
    type _IsDraft = Expect<Equal<typeof draft, Order<DraftState>>>;
  });

  it("transitions DraftState -> ValidatedState -> PaidState -> ShippedState", () => {
    const user = makeUserId("usr_frankie");
    const orderId = makeOrderId("ord_step_by_step");
    const sku = makeSku("PROD-HEADPHONES");
    const price = makePositiveCents(15000);

    // 1. Draft
    const draft = Order.create(orderId, user)
      .addItem(sku, price, 2)
      .applyDiscount(makePercentageDiscount(10));

    // 2. Validate
    const validated = draft.validate();
    expect(validated.calculateTotal()).toBe(27000 as PositiveCents); // (15000 * 2) - 10% = 27000

    // 3. Pay
    const paid = validated.pay("tx_stripe_test_123");
    expect(paid.payment?.transactionId).toBe("tx_stripe_test_123");
    expect(paid.payment?.amount).toBe(27000 as PositiveCents);

    // 4. Ship
    const shipped = paid.ship("FedEx", "FX-99228811");
    expect(shipped.shipping?.carrier).toBe("FedEx");
    expect(shipped.shipping?.trackingNumber).toBe("FX-99228811");
  });

  it("prevents validation of an empty draft order", () => {
    const user = makeUserId("usr_grace01");
    const orderId = makeOrderId("ord_empty_cart");
    const emptyDraft = Order.create(orderId, user);

    expect(() => emptyDraft.validate()).toThrow(/Cannot validate an order with 0 items/);
  });

  it("allows order cancellation from Draft or Validated state", () => {
    const user = makeUserId("usr_heidi99");
    const orderId = makeOrderId("ord_cancel_me");
    const sku = makeSku("BOOK-DESIGN");
    const price = makePositiveCents(3000);

    const draft = Order.create(orderId, user).addItem(sku, price, 1);
    const validated = draft.validate();

    const cancelled = validated.cancel("Customer changed mind");
    expect(cancelled.cancellationReason).toBe("Customer changed mind");
  });

  it("executes the full e-commerce lifecycle workflow seamlessly", () => {
    const result = executeOrderLifecycle();
    expect(result.orderId.startsWith("ord_")).toBe(true);
    expect(result.customerId.startsWith("usr_")).toBe(true);
    expect(result.finalTotalCents).toBeGreaterThan(0 as PositiveCents);
    expect(result.carrier).toBe("DHL");
    expect(result.trackingNumber).toBe("DHL-EXPRESS-99120");

    const cancelResult = executeCancellationLifecycle("Out of stock");
    expect(cancelResult.cancellationReason).toBe("Out of stock");
  });
});
