/**
 * COHESIVE MODULE 1: PURE DOMAIN ENTITY & RULES
 *
 * Responsibilities:
 * - Domain Invariants & Type definitions
 * - Subtotal, Tax, and Total calculations
 * - Pure business validation (no HTTP, SQL, or HTML dependencies)
 */

export interface InvoiceItem {
  description: string;
  priceCents: number;
  quantity: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  items: InvoiceItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: Date;
}

export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxExempt: boolean = false
): { subtotalCents: number; taxCents: number; totalCents: number } {
  let subtotalCents = 0;

  for (const item of items) {
    if (item.priceCents < 0) {
      throw new Error(`Item price cannot be negative: ${item.description}`);
    }
    if (item.quantity <= 0) {
      throw new Error(`Item quantity must be positive: ${item.description}`);
    }
    subtotalCents += item.priceCents * item.quantity;
  }

  const taxRate = taxExempt ? 0 : 0.0825;
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;

  return { subtotalCents, taxCents, totalCents };
}

export function createInvoice(
  id: string,
  customerId: string,
  items: InvoiceItem[],
  options: { taxExempt?: boolean } = {}
): Invoice {
  if (!customerId) {
    throw new Error("Customer ID is required to issue an invoice");
  }
  if (items.length === 0) {
    throw new Error("Invoice must have at least one line item");
  }

  const totals = calculateInvoiceTotals(items, options.taxExempt ?? false);

  return {
    id,
    customerId,
    items,
    ...totals,
    createdAt: new Date(),
  };
}
