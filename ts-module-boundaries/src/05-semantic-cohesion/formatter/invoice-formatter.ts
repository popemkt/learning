/**
 * COHESIVE MODULE 3: PRESENTATION FORMATTER
 *
 * Responsibilities:
 * - Currency formatting ($X.XX)
 * - HTML preview rendering
 * - Plain text receipts
 */

import type { Invoice } from "../domain/invoice.js";

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function renderInvoiceHtml(invoice: Invoice): string {
  const itemRows = invoice.items
    .map(i => `<li>${i.description} x${i.quantity} — ${formatCurrency(i.priceCents * i.quantity)}</li>`)
    .join("\n");

  return `
<div class="invoice-card">
  <h1>Invoice ${invoice.id}</h1>
  <p>Customer: ${invoice.customerId}</p>
  <ul>
    ${itemRows}
  </ul>
  <p>Subtotal: ${formatCurrency(invoice.subtotalCents)}</p>
  <p>Tax: ${formatCurrency(invoice.taxCents)}</p>
  <h2>Total: ${formatCurrency(invoice.totalCents)}</h2>
</div>
  `.trim();
}

export function renderInvoiceTextSummary(invoice: Invoice): string {
  return `Invoice ${invoice.id} | Customer: ${invoice.customerId} | Total: ${formatCurrency(invoice.totalCents)}`;
}
