/**
 * COHESIVE MODULE 4: HTTP CONTROLLER
 *
 * Responsibilities:
 * - HTTP request header & body validation
 * - Status code orchestration (201 Created, 400 Bad Request, 415 Unsupported Media Type)
 * - Coordinating Domain, Repository, and Formatter
 */

import { createInvoice } from "../domain/invoice.js";
import type { InvoiceRepository } from "../repository/invoice-repository.js";
import { renderInvoiceHtml } from "../formatter/invoice-formatter.js";
import type { HttpRequest, HttpResponse } from "../mixed-service.js";

export class InvoiceController {
  constructor(private readonly repository: InvoiceRepository) {}

  async createInvoiceHandler(req: HttpRequest): Promise<HttpResponse> {
    if (!req.headers["content-type"]?.includes("application/json")) {
      return {
        statusCode: 415,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "Unsupported Media Type: expected application/json" }),
      };
    }

    if (!req.body?.customerId || !Array.isArray(req.body.items) || req.body.items.length === 0) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "Bad Request: Missing customerId or line items" }),
      };
    }

    try {
      const invoiceId = `INV-${Date.now()}`;
      const invoice = createInvoice(
        invoiceId,
        req.body.customerId,
        req.body.items,
        { taxExempt: req.body.taxExempt }
      );

      await this.repository.save(invoice);
      const htmlPreview = renderInvoiceHtml(invoice);

      return {
        statusCode: 201,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          totalCents: invoice.totalCents,
          htmlPreview,
        }),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      return {
        statusCode: 422,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: message }),
      };
    }
  }
}
