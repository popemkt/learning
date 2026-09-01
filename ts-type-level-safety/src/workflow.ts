// ============================================================================
// REAL-WORLD SHOWCASE: NEWTYPE + TYPESTATE WORKING TOGETHER
//
// Demonstrates an end-to-end e-commerce order fulfillment pipeline where
// every identifier is a branded Newtype, and every lifecycle step is a
// Typestate compile-time transition.
// ============================================================================

import {
  makeUserId,
  makeOrderId,
  makeSku,
  makePositiveCents,
  makePercentageDiscount,
  type UserId,
  type OrderId,
  type Sku,
  type PositiveCents,
  type PercentageDiscount,
} from "./newtype.js";

import {
  Order,
  type DraftState,
  type ValidatedState,
  type PaidState,
  type ShippedState,
  type CancelledState,
} from "./typestate.js";

export interface CheckoutResult {
  readonly orderId: OrderId;
  readonly customerId: UserId;
  readonly finalTotalCents: PositiveCents;
  readonly trackingNumber: string;
  readonly carrier: string;
}

/**
 * Runs a complete, successful order lifecycle from Draft -> Validated -> Paid -> Shipped.
 * ✅ ATTENTION: Notice how each variable has a different parameterized type!
 */
export function executeOrderLifecycle(): CheckoutResult {
  // Step 1: Instantiate validated Branded Types (Newtype Pattern)
  const customerId = makeUserId("usr_alice99");
  const orderId = makeOrderId("ord_20260901_01");
  const laptopSku = makeSku("TECH-LAPTOP01");
  const mouseSku = makeSku("TECH-MOUSE02");

  const laptopPrice = makePositiveCents(120000); // $1,200.00
  const mousePrice = makePositiveCents(3500);    // $35.00
  const discount = makePercentageDiscount(10);   // 10% off

  // Step 2: Create initial Draft Order (Typestate: Order<DraftState>)
  // 🔒 COMPILE-TIME: 'draftOrder' is typed strictly as Order<DraftState>
  const draftOrder: Order<DraftState> = Order.create(orderId, customerId)
    .addItem(laptopSku, laptopPrice, 1)
    .addItem(mouseSku, mousePrice, 2)
    .applyDiscount(discount);

  // Step 3: Validate Draft Order (Typestate Transition -> Order<ValidatedState>)
  // 🔒 COMPILE-TIME: Only validated orders can calculate totals or proceed to payment
  const validatedOrder: Order<ValidatedState> = draftOrder.validate();
  const totalAmount = validatedOrder.calculateTotal();

  // Step 4: Process Payment (Typestate Transition -> Order<PaidState>)
  // 🔒 COMPILE-TIME: 'paidOrder' guarantees payment receipt exists
  const paidOrder: Order<PaidState> = validatedOrder.pay("stripe_ch_99217831");

  // Step 5: Dispatch & Ship (Typestate Transition -> Order<ShippedState>)
  // 🔒 COMPILE-TIME: 'shippedOrder' has immutable tracking and shipping data
  const shippedOrder: Order<ShippedState> = paidOrder.ship("DHL", "DHL-EXPRESS-99120");

  return {
    orderId: shippedOrder.id,
    customerId: shippedOrder.customerId,
    finalTotalCents: totalAmount,
    trackingNumber: shippedOrder.shipping?.trackingNumber ?? "",
    carrier: shippedOrder.shipping?.carrier ?? "",
  };
}

/**
 * Demonstrates cancellation flow before payment.
 */
export function executeCancellationLifecycle(reason: string): Order<CancelledState> {
  const customerId = makeUserId("usr_bob2026");
  const orderId = makeOrderId("ord_cancel_02");
  const sku = makeSku("BOOK-TYPESCRIPT");
  const price = makePositiveCents(4500);

  const draft = Order.create(orderId, customerId).addItem(sku, price, 1);
  const validated = draft.validate();

  // ✅ ATTENTION: Cancelling a validated order returns Order<CancelledState>
  const cancelled: Order<CancelledState> = validated.cancel(reason);
  return cancelled;
}
