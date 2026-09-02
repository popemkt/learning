/**
 * demo.ts
 *
 * Interactive tour demonstrating the 3 core type-level safety pillars with inline code snippets.
 */

import {
  makeUserId,
  makeOrderId,
  makeSku,
  makePositiveCents,
  makePercentageDiscount,
  addCents,
  applyDiscount,
  isUserId,
  isOrderId,
  processCharge,
} from "./newtype.js";

import {
  Order,
  type DraftState,
  type ValidatedState,
  type PaidState,
  type ShippedState,
} from "./typestate.js";

import { executeOrderLifecycle } from "./workflow.js";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function banner(title: string): void {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║  ${title.padEnd(74)}║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

function section(num: number, title: string): void {
  console.log(`\n${colors.bold}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}▶ Pillar ${num}: ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function codeSnippet(title: string, code: string): void {
  console.log(`  ${colors.dim}┌─ 💻 ${colors.cyan}${title}${colors.dim} ──────────────────────────────────────────${colors.reset}`);
  for (const line of code.trim().split("\n")) {
    console.log(`  ${colors.dim}│${colors.reset}  ${line}`);
  }
  console.log(`  ${colors.dim}└─────────────────────────────────────────────────────────────${colors.reset}\n`);
}

function pass(msg: string): void {
  console.log(`  ${colors.green}✔ ${msg}${colors.reset}`);
}

function info(msg: string): void {
  console.log(`  ${colors.dim}ℹ ${msg}${colors.reset}`);
}

export function runDemo(): void {
  banner("TypeScript Type-Level Safety: Newtype & Typestate Architecture");

  // --------------------------------------------------------------------------
  // Pillar 1: The Newtype Pattern (Nominal Branding)
  // --------------------------------------------------------------------------
  section(1, "Nominal Branding & Triple-Gate Validation (newtype.ts)");

  codeSnippet("Phantom Branding & Smart Constructors", `
declare const __brand: unique symbol;
export type Brand<T, Tag extends string> = T & { readonly [__brand]: Tag };

export type UserId = Brand<\`usr_\${string}\`, "UserId">;
export type OrderId = Brand<\`ord_\${string}\`, "OrderId">;

export function processCharge(user: UserId, order: OrderId, cents: PositiveCents) { ... }
// 🔒 COMPILE-TIME: Swapping (order, user) fails with TS2345 (Zero runtime overhead!)
  `);

  const userId = makeUserId("usr_alice99");
  const orderId = makeOrderId("ord_20260901_01");
  const price = makePositiveCents(4999); // $49.99
  const discount = makePercentageDiscount(15); // 15%

  pass(`Smart Constructors: Created ${userId} and ${orderId}`);
  pass(`Type Guards: isUserId('${userId}') = ${isUserId(userId)}`);
  
  const discountedPrice = applyDiscount(price, discount);
  pass(`Brand-safe math: $${(price / 100).toFixed(2)} - 15% = $${(discountedPrice / 100).toFixed(2)}`);

  const chargeResult = processCharge(userId, orderId, discountedPrice);
  pass(`Argument Safety: Charge processed for user ${chargeResult.userId} (Order ${chargeResult.orderId})`);
  info("Swapping userId and orderId fails at compile-time (TS2345) with 0 runtime overhead");

  // --------------------------------------------------------------------------
  // Pillar 2: The Typestate Pattern (Compile-Time State Machines)
  // --------------------------------------------------------------------------
  section(2, "Typestate Lifecycle State Machine (typestate.ts)");

  codeSnippet("Generic Phantom State Token Transitions", `
export class Order<State extends OrderStateToken> {
  // Only callable in DraftState:
  addItem(this: Order<DraftState>, sku: Sku, price: PositiveCents, qty: number): Order<DraftState>;

  // Transition: DraftState -> ValidatedState
  validate(this: Order<DraftState>): Order<ValidatedState>;

  // Transition: ValidatedState -> PaidState
  pay(this: Order<ValidatedState>, txId: string): Order<PaidState>;

  // Transition: PaidState -> ShippedState
  ship(this: Order<PaidState>, carrier: "DHL" | "FedEx", track: string): Order<ShippedState>;
}
// 🔒 COMPILE-TIME: Calling ship() on a Draft order is a compile error!
  `);

  // 1. Draft
  const draft: Order<DraftState> = Order.create(orderId, userId)
    .addItem(makeSku("TECH-LAPTOP01"), makePositiveCents(120000), 1)
    .addItem(makeSku("TECH-MOUSE02"), makePositiveCents(3500), 2)
    .applyDiscount(makePercentageDiscount(10));
  pass(`State 1 [Draft]: Added items & discount (Total items: ${draft.items.length})`);

  // 2. Validated
  const validated: Order<ValidatedState> = draft.validate();
  const total = validated.calculateTotal();
  pass(`State 2 [Validated]: Final Total = $${(total / 100).toFixed(2)}`);

  // 3. Paid
  const paid: Order<PaidState> = validated.pay("tx_stripe_994827");
  pass(`State 3 [Paid]: Transaction ${paid.payment?.transactionId} recorded`);

  // 4. Shipped
  const shipped: Order<ShippedState> = paid.ship("DHL", "TRACK_9981726");
  pass(`State 4 [Shipped]: Carrier ${shipped.shipping?.carrier}, Tracking ${shipped.shipping?.trackingNumber}`);
  info("Calling ship() on a Draft order is a compile-time TS error (no runtime defensive checks needed)");

  // --------------------------------------------------------------------------
  // Pillar 3: End-to-End Workflow Pipeline
  // --------------------------------------------------------------------------
  section(3, "End-to-End Workflow Execution (workflow.ts)");

  codeSnippet("Pipeline Execution", `
const customerId = makeUserId("usr_alice99");
const orderId = makeOrderId("ord_20260901_01");

const checkout = Order.create(orderId, customerId)
  .addItem(laptopSku, laptopPrice, 1)
  .validate()
  .pay("stripe_tx_123")
  .ship("DHL", "TRACK_001");
  `);

  const checkout = executeOrderLifecycle();
  pass(`Checkout Pipeline completed: Order ${checkout.orderId} shipped to ${checkout.customerId}`);
  pass(`Final amount charged: $${(checkout.finalTotalCents / 100).toFixed(2)} via ${checkout.carrier}`);

  console.log(`\n${colors.bold}${colors.green}✨ All 3 Type-Level Safety modules executed cleanly!${colors.reset}\n`);
}

if (import.meta.main) {
  runDemo();
}
