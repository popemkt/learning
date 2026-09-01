import { describe, it, expect } from "bun:test";
import {
  makeUserId,
  makeOrderId,
  makeSku,
  makeEmailAddress,
  makePositiveCents,
  makePercentageDiscount,
  addCents,
  applyDiscount,
  processCharge,
  type UserId,
  type OrderId,
  type Sku,
  type EmailAddress,
  type PositiveCents,
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

describe("Concept 1: Newtype / Branded Types Pattern", () => {
  it("creates valid branded UserId and rejects malformed strings", () => {
    const validUser = makeUserId("usr_charlie");
    expect(validUser).toBe("usr_charlie" as UserId);

    // 🔒 COMPILE-TIME: Assert UserId brand exists
    type _TypeCheck = Expect<Equal<typeof validUser, UserId>>;

    // ⚠️ CRITICAL: Invariant violation checks
    expect(() => makeUserId("invalid_prefix")).toThrow(/Invalid UserId format/);
    expect(() => makeUserId("usr_1")).toThrow(/Invalid UserId format/);
  });

  it("creates valid OrderId and enforces format invariants", () => {
    const validOrder = makeOrderId("ord_99001122");
    expect(validOrder).toBe("ord_99001122" as OrderId);
    expect(() => makeOrderId("ord_1")).toThrow(/Invalid OrderId format/);
    expect(() => makeOrderId("wrong_prefix_1234")).toThrow(/Invalid OrderId format/);
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

    expect(() => makePositiveCents(0)).toThrow(/PositiveCents must be a positive integer/);
    expect(() => makePositiveCents(-500)).toThrow(/PositiveCents must be a positive integer/);
    expect(() => makePositiveCents(12.5)).toThrow(/PositiveCents must be a positive integer/);
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
