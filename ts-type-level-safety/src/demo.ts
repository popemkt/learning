// ============================================================================
// INTERACTIVE DEMO: NEWTYPE & TYPESTATE PATTERNS IN TYPESCRIPT
//
// Run via: bun run demo (or bun run src/demo.ts)
// ============================================================================

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
  type PositiveCents,
} from "./newtype.js";

import {
  Order,
  type DraftState,
  type ValidatedState,
  type PaidState,
  type ShippedState,
  type CancelledState,
} from "./typestate.js";

function printHeader(title: string) {
  console.log("\n" + "=".repeat(78));
  console.log(`  ${title}`);
  console.log("=".repeat(78));
}

function printSection(title: string) {
  console.log(`\n--- [ ${title} ] ` + "-".repeat(Math.max(2, 70 - title.length)));
}

async function runDemo() {
  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│  TYPESCRIPT TYPE-LEVEL ARCHITECTURE: NEWTYPE & TYPESTATE PATTERNS           │
│  Zero-Runtime Overhead • Compile-Time Invariant & Lifecycle Enforcement     │
└─────────────────────────────────────────────────────────────────────────────┘`);

  // ==========================================================================
  // DEMO PART 1: THE NEWTYPE (BRANDED TYPES) PATTERN
  // ==========================================================================
  printHeader("PART 1: THE NEWTYPE PATTERN (Branded Nominal Types)");
  console.log("Problem: TypeScript structural typing allows swapping 'string' IDs or numbers.");
  console.log("Solution: Phantom unique symbols create nominal types with zero runtime cost.\n");

  printSection("1.1 Creating Valid Branded Values via Smart Constructors");
  const user: UserId = makeUserId("usr_alexander");
  const order: OrderId = makeOrderId("ord_2026_0901");
  const keyboardSku: Sku = makeSku("HARD-KB990");
  const email = makeEmailAddress("alexander.dev@company.com");
  const itemPrice: PositiveCents = makePositiveCents(12900); // $129.00
  const discountRate = makePercentageDiscount(15); // 15% off

  console.log(`[PASS] Valid UserId created:         ${user}`);
  console.log(`[PASS] Valid OrderId created:        ${order}`);
  console.log(`[PASS] Valid Sku created:            ${keyboardSku}`);
  console.log(`[PASS] Valid EmailAddress created:   ${email}`);
  console.log(`[PASS] Valid PositiveCents created:  ${itemPrice} cents ($${(itemPrice / 100).toFixed(2)})`);
  console.log(`[PASS] Valid DiscountRate created:   ${discountRate}%`);

  printSection("1.2 Enforcing Invariants at Boundaries");
  try {
    makePositiveCents(-500);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[BLOCKED] Negative money rejected:    ${msg}`);
  }

  try {
    makeUserId("plain_string_without_prefix");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[BLOCKED] Invalid UserId format:     ${msg}`);
  }

  printSection("1.3 Compile-Time Argument Swap Prevention");
  console.log("Executing type-safe payment processing with processCharge(userId, orderId, amount):");
  const charge = processCharge(user, order, itemPrice);
  console.log(`[CHARGED] Receipt: ${charge.receiptNumber} | Amount: $${(charge.chargedAmount / 100).toFixed(2)} to ${charge.userId}`);
  console.log("\n🔒 COMPILE-TIME GUARANTEE: Calling processCharge(order, user, amount) fails with:");
  console.log("   --> TS2345: Type '\"OrderId\"' is not assignable to type '\"UserId\"'.");

  // ==========================================================================
  // DEMO PART 2: THE TYPESTATE (COMPILE-TIME STATE MACHINES) PATTERN
  // ==========================================================================
  printHeader("PART 2: THE TYPESTATE PATTERN (Compile-Time State Machines)");
  console.log("Problem: Out-of-order method calls (e.g. shipping unpaid orders) crash at runtime.");
  console.log("Solution: Entity state is encoded as a generic type parameter (Order<State>).\n");

  printSection("2.1 Lifecycle State 1: Order<DraftState>");
  const draftOrder: Order<DraftState> = Order.create(order, user)
    .addItem(keyboardSku, itemPrice, 2)
    .applyDiscount(discountRate);

  console.log(`Current State:   Order<DraftState>`);
  console.log(`Items in Cart:   ${draftOrder.items.length} items (${draftOrder.items[0].sku} x ${draftOrder.items[0].quantity})`);
  console.log(`Discount:        ${draftOrder.discount}% applied`);
  console.log(`Allowed Actions: addItem(), applyDiscount(), validate(), cancel()`);

  printSection("2.2 Lifecycle State 2: Order<ValidatedState>");
  const validatedOrder: Order<ValidatedState> = draftOrder.validate();
  const totalCents = validatedOrder.calculateTotal();

  console.log(`Current State:   Order<ValidatedState>`);
  console.log(`Calculated Total:$${(totalCents / 100).toFixed(2)} (with ${discountRate}% discount)`);
  console.log(`Allowed Actions: pay(), cancel()`);

  printSection("2.3 Lifecycle State 3: Order<PaidState>");
  const paidOrder: Order<PaidState> = validatedOrder.pay("stripe_pi_38821903");

  console.log(`Current State:   Order<PaidState>`);
  console.log(`Transaction:     ${paidOrder.payment?.transactionId}`);
  console.log(`Amount Paid:     $${((paidOrder.payment?.amount ?? 0) / 100).toFixed(2)} at ${paidOrder.payment?.paidAt.toISOString()}`);
  console.log(`Allowed Actions: ship()`);

  printSection("2.4 Lifecycle State 4: Order<ShippedState>");
  const shippedOrder: Order<ShippedState> = paidOrder.ship("DHL", "DHL-GLOBAL-998822");

  console.log(`Current State:   Order<ShippedState>`);
  console.log(`Carrier:         ${shippedOrder.shipping?.carrier}`);
  console.log(`Tracking Number: ${shippedOrder.shipping?.trackingNumber}`);
  console.log(`Status:          Terminal state reached successfully!`);

  // ==========================================================================
  // DEMO PART 3: THE IMPOSSIBILITY MATRIX (Compile-Time Proofs)
  // ==========================================================================
  printHeader("PART 3: THE COMPILE-TIME IMPOSSIBILITY MATRIX");
  console.log(`
| Attempted Illegal Operation                | Runtime Behavior | Compile-Time Result (Typestate)        |
| :----------------------------------------- | :--------------- | :------------------------------------- |
| draftOrder.ship("DHL", "123")              | Silent / Crash   | 🔒 TS2345: 'this' not Order<PaidState>  |
| paidOrder.addItem(sku, price, 1)           | Data Corruption  | 🔒 TS2345: 'this' not Order<DraftState> |
| shippedOrder.pay("fake_receipt")           | Double Charging  | 🔒 TS2345: 'this' not Order<Validated>  |
| processCharge(orderId, userId, amount)     | Wrong Account    | 🔒 TS2345: 'OrderId' is not 'UserId'   |
| makePositiveCents(-100)                    | Negative Price   | ⚠️ Invariant Exception at Boundary     |
`);

  console.log("=" .repeat(78));
  console.log("  [SUCCESS] All Newtype and Typestate demonstrations completed flawlessly!");
  console.log("=" .repeat(78) + "\n");
}

runDemo().catch(console.error);
