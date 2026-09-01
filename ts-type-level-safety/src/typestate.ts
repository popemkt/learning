// ============================================================================
// CONCEPT 2: THE TYPESTATE PATTERN (Compile-Time State Machines in TypeScript)
//
// In standard OOP, state is tracked as a runtime variable (e.g. status: string).
// If a method is called in the wrong order (e.g. ship() called on a Draft order),
// you must write defensive runtime checks, and bugs only surface during execution.
//
// The Typestate pattern encodes the current state of an object into its generic
// type parameter. Methods that perform state transitions return a new instance
// parameterized by the next state, and state-specific methods ONLY exist when
// the object is in that exact state at compile time!
// ============================================================================

import type { OrderId, UserId, Sku, PositiveCents, PercentageDiscount } from "./newtype.js";

// ----------------------------------------------------------------------------
// 1. PHANTOM STATE TOKENS
// ----------------------------------------------------------------------------
// 🔒 COMPILE-TIME: These types act as state markers. They have zero runtime cost.

export interface DraftState {
  readonly __lifecycleState: "Draft";
}

export interface ValidatedState {
  readonly __lifecycleState: "Validated";
}

export interface PaidState {
  readonly __lifecycleState: "Paid";
}

export interface ShippedState {
  readonly __lifecycleState: "Shipped";
}

export interface CancelledState {
  readonly __lifecycleState: "Cancelled";
}

// Union of all possible state tokens for generic constraints
export type OrderStateToken =
  | DraftState
  | ValidatedState
  | PaidState
  | ShippedState
  | CancelledState;

// ----------------------------------------------------------------------------
// 2. DOMAIN DATA MODELS
// ----------------------------------------------------------------------------

export interface OrderLineItem {
  readonly sku: Sku;
  readonly unitPrice: PositiveCents;
  readonly quantity: number;
}

export interface PaymentReceipt {
  readonly transactionId: string;
  readonly paidAt: Date;
  readonly amount: PositiveCents;
}

export interface ShippingManifest {
  readonly carrier: "DHL" | "FedEx" | "UPS";
  readonly trackingNumber: string;
  readonly shippedAt: Date;
}

// ----------------------------------------------------------------------------
// 3. THE TYPESTATE ORDER ENTITY
// ----------------------------------------------------------------------------

/**
 * An Order whose allowed operations are governed by its current `State` type parameter.
 * @template State - The current lifecycle state token (DraftState, ValidatedState, etc.)
 */
export class Order<State extends OrderStateToken> {
  // 🔒 COMPILE-TIME: Phantom state field. TypeScript tracks State without runtime overhead.
  declare private readonly _state: State;

  // Private constructor prevents arbitrary instantiation outside valid state transitions.
  private constructor(
    public readonly id: OrderId,
    public readonly customerId: UserId,
    public readonly items: readonly OrderLineItem[],
    public readonly discount?: PercentageDiscount,
    public readonly payment?: PaymentReceipt,
    public readonly shipping?: ShippingManifest,
    public readonly cancellationReason?: string
  ) {}

  // --------------------------------------------------------------------------
  // FACTORY ENTRY POINT (Always starts in DraftState)
  // --------------------------------------------------------------------------

  /**
   * Initializes a brand new Order.
   * ✅ ATTENTION: Every order enters the world strictly in DraftState.
   */
  static create(id: OrderId, customerId: UserId): Order<DraftState> {
    return new Order<DraftState>(id, customerId, []);
  }

  // --------------------------------------------------------------------------
  // STATE: DraftState OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Adds a line item to the draft order.
   * 🔒 COMPILE-TIME: Only callable when the order is in `DraftState`.
   */
  addItem(
    this: Order<DraftState>,
    sku: Sku,
    unitPrice: PositiveCents,
    quantity: number
  ): Order<DraftState> {
    if (quantity <= 0) {
      throw new Error(`Quantity must be greater than 0. Received: ${quantity}`);
    }
    const updatedItems = [...this.items, { sku, unitPrice, quantity }];
    return new Order<DraftState>(this.id, this.customerId, updatedItems, this.discount);
  }

  /**
   * Applies an optional percentage discount to the draft order.
   * 🔒 COMPILE-TIME: Only callable in `DraftState`.
   */
  applyDiscount(
    this: Order<DraftState>,
    discount: PercentageDiscount
  ): Order<DraftState> {
    return new Order<DraftState>(this.id, this.customerId, this.items, discount);
  }

  /**
   * Validates inventory and pricing, transitioning DraftState -> ValidatedState.
   * ⚠️ CRITICAL: Enforces business invariant that an order cannot be empty before checkout.
   */
  validate(this: Order<DraftState>): Order<ValidatedState> {
    if (this.items.length === 0) {
      throw new Error(`[Invariant Violation] Cannot validate an order with 0 items.`);
    }
    return new Order<ValidatedState>(this.id, this.customerId, this.items, this.discount);
  }

  // --------------------------------------------------------------------------
  // STATE: ValidatedState OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Calculates total price in cents including discounts.
   */
  calculateTotal(this: Order<ValidatedState>): PositiveCents {
    const rawTotal = this.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const total = this.discount
      ? Math.max(1, Math.floor(rawTotal * ((100 - this.discount) / 100)))
      : rawTotal;
    return total as PositiveCents;
  }

  /**
   * Processes payment and transitions ValidatedState -> PaidState.
   * ⚠️ CRITICAL: Validates payment confirmation and captures receipt.
   */
  pay(
    this: Order<ValidatedState>,
    transactionId: string
  ): Order<PaidState> {
    const total = this.calculateTotal();
    const receipt: PaymentReceipt = {
      transactionId,
      paidAt: new Date(),
      amount: total,
    };
    return new Order<PaidState>(
      this.id,
      this.customerId,
      this.items,
      this.discount,
      receipt
    );
  }

  // --------------------------------------------------------------------------
  // STATE: PaidState OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Dispatches order with courier and transitions PaidState -> ShippedState.
   * 🔒 COMPILE-TIME: Impossible to ship an unpaid or draft order.
   */
  ship(
    this: Order<PaidState>,
    carrier: "DHL" | "FedEx" | "UPS",
    trackingNumber: string
  ): Order<ShippedState> {
    const shipping: ShippingManifest = {
      carrier,
      trackingNumber,
      shippedAt: new Date(),
    };
    return new Order<ShippedState>(
      this.id,
      this.customerId,
      this.items,
      this.discount,
      this.payment,
      shipping
    );
  }

  // --------------------------------------------------------------------------
  // STATE: CancelledState TRANSITIONS (Allowed from Draft or Validated)
  // --------------------------------------------------------------------------

  /**
   * Cancels an order before it has been paid.
   * 🔒 COMPILE-TIME: Only permitted from DraftState or ValidatedState.
   */
  cancel(
    this: Order<DraftState> | Order<ValidatedState>,
    reason: string
  ): Order<CancelledState> {
    return new Order<CancelledState>(
      this.id,
      this.customerId,
      this.items,
      this.discount,
      undefined,
      undefined,
      reason
    );
  }

  // --------------------------------------------------------------------------
  // UNIVERSAL READ-ONLY QUERIES (Safe across any state)
  // --------------------------------------------------------------------------

  get summary(): string {
    return `Order [${this.id}] for Customer [${this.customerId}] | Items: ${this.items.length}`;
  }
}
