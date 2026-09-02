# Production TypeScript Type-Level Safety: Newtype & Typestate Architecture

A clean, modular workspace demonstrating zero-overhead compile-time type safety patterns:
- **`src/newtype.ts`**: Nominal Branding (Newtypes), Template Literal Patterns, Type-Level Number Constraints, and the "Triple Gate" Validation Architecture.
- **`src/typestate.ts`**: The Typestate Pattern (Compile-Time State Machines, Phantom State Tokens, Impossible State Prevention).
- **`src/workflow.ts`**: End-to-End Workflow Pipeline uniting Newtype and Typestate into an automated e-commerce order fulfillment pipeline.

---

## 1. Core Modules

```
ts-type-level-safety/
├── src/
│   ├── newtype.ts    # Nominal branding, template literal types, triple-gate validation
│   ├── typestate.ts  # Typestate compile-time state machines (Draft -> Validated -> Paid -> Shipped)
│   ├── workflow.ts   # End-to-end checkout pipeline combining newtypes + typestates
│   └── demo.ts       # Interactive tour executing all 3 modules
├── tests/
│   └── type-level-safety.test.ts  # Complete Bun test suite (9 passing tests)
├── package.json
└── tsconfig.json
```

---

## 2. Deep Dive: The 3 Pillars

### Pillar 1: Nominal Branding & The "Triple Gate" (`newtype.ts`)
TypeScript is a structural type system. By default, any `string` can be passed to any function expecting a `string`, allowing catastrophic parameter swaps:

```ts
// 🔒 COMPILE-TIME: Phantom symbol attaching nominal branding with zero runtime overhead
declare const __brand: unique symbol;
export type Brand<T, BrandTag extends string> = T & { readonly [__brand]: BrandTag };

export type UserId = Brand<`usr_${string}`, "UserId">;
export type OrderId = Brand<`ord_${string}`, "OrderId">;
export type PositiveCents = Brand<number, "PositiveCents">;
```

#### The "Triple Gate" Validation Architecture
1. **Predicate** (`isUserId(val): val is UserId`): Non-throwing type guard for filtering and conditionals.
2. **Assertion Function** (`assertUserId(val): asserts val is UserId`): In-place type narrowing for middleware and test assertions.
3. **Smart Constructor** (`makeUserId(raw): UserId`): Trims, normalizes, sanitizes, and returns a verified branded type.

---

### Pillar 2: The Typestate Pattern (`typestate.ts`)
Instead of tracking state as a runtime string (`status === "paid"`), state is encoded into a generic type parameter `Order<State>`:

```ts
export interface DraftState { readonly __lifecycleState: "Draft"; }
export interface ValidatedState { readonly __lifecycleState: "Validated"; }
export interface PaidState { readonly __lifecycleState: "Paid"; }
export interface ShippedState { readonly __lifecycleState: "Shipped"; }

export class Order<State extends OrderStateToken> {
  // Method only callable in DraftState:
  addItem(this: Order<DraftState>, sku: Sku, price: PositiveCents, qty: number): Order<DraftState>;

  // Transition DraftState -> ValidatedState:
  validate(this: Order<DraftState>): Order<ValidatedState>;

  // Transition ValidatedState -> PaidState:
  pay(this: Order<ValidatedState>, transactionId: string): Order<PaidState>;

  // Transition PaidState -> ShippedState:
  ship(this: Order<PaidState>, carrier: "DHL" | "FedEx" | "UPS", trackingNumber: string): Order<ShippedState>;
}
```

**Compile-Time Guarantees**:
- Calling `ship()` on a `Draft` order is a **TypeScript compile error (`TS2345`)**.
- Zero defensive runtime `if (!isPaid) throw Error` checks needed inside `ship()`.

---

### Pillar 3: End-to-End Workflow Pipeline (`workflow.ts`)
Connects the Newtype and Typestate patterns into a complete lifecycle:

```ts
const customerId = makeUserId("usr_alice99");
const orderId = makeOrderId("ord_20260901_01");

// 1. Draft (Order<DraftState>)
const draft = Order.create(orderId, customerId)
  .addItem(makeSku("TECH-LAPTOP01"), makePositiveCents(120000), 1)
  .applyDiscount(makePercentageDiscount(10));

// 2. Validate (Order<ValidatedState>)
const validated = draft.validate();

// 3. Pay (Order<PaidState>)
const paid = validated.pay("stripe_ch_99217831");

// 4. Ship (Order<ShippedState>)
const shipped = paid.ship("DHL", "DHL-EXPRESS-99120");
```

---

## 3. Running Demos & Verification

```bash
cd ts-type-level-safety

# Run the interactive tour
bun run demo

# Run the automated test suite
bun test

# Run strict TypeScript typecheck
bun x tsc --noEmit
```
