/**
 * MIXED CONCERNS ANTI-PATTERN (God Object / Poor Semantic Cohesion)
 *
 * This single class combines:
 * 1. HTTP Transport (Request parsing, status codes, headers)
 * 2. Persistence / DB (SQL serialization, mock database calls)
 * 3. Business Domain Logic (Tax calculation, discount rules, line items)
 * 4. Presentation Formatting (HTML/Text invoice rendering)
 */

export interface HttpRequest {
  headers: Record<string, string>;
  body: {
    customerId: string;
    items: Array<{ description: string; priceCents: number; quantity: number }>;
    taxExempt?: boolean;
  };
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export class GodInvoiceService {
  // DB state mixed into service
  private readonly dbTable = new Map<string, string>();

  async handleCreateInvoiceHttpRequest(req: HttpRequest): Promise<HttpResponse> {
    // ----------------------------------------------------
    // CONCERN 1: HTTP Transport & Protocol Validation
    // ----------------------------------------------------
    if (!req.headers["content-type"]?.includes("application/json")) {
      return {
        statusCode: 415,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "Unsupported Media Type" }),
      };
    }

    if (!req.body?.customerId || !Array.isArray(req.body.items) || req.body.items.length === 0) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "Missing customerId or items payload" }),
      };
    }

    // ----------------------------------------------------
    // CONCERN 2: Business Domain Rules & Calculations
    // ----------------------------------------------------
    let subtotalCents = 0;
    for (const item of req.body.items) {
      if (item.priceCents < 0 || item.quantity <= 0) {
        return {
          statusCode: 422,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ error: `Invalid line item: ${item.description}` }),
        };
      }
      subtotalCents += item.priceCents * item.quantity;
    }

    const taxRate = req.body.taxExempt ? 0 : 0.0825; // 8.25% standard tax
    const taxCents = Math.round(subtotalCents * taxRate);
    const totalCents = subtotalCents + taxCents;
    const invoiceId = `INV-${Date.now()}`;

    // ----------------------------------------------------
    // CONCERN 3: Persistence & Database Serialization
    // ----------------------------------------------------
    const sqlInsert = `INSERT INTO invoices (id, customer_id, subtotal, tax, total, created_at) VALUES ('${invoiceId}', '${req.body.customerId}', ${subtotalCents}, ${taxCents}, ${totalCents}, NOW())`;
    this.dbTable.set(invoiceId, sqlInsert);

    // ----------------------------------------------------
    // CONCERN 4: Presentation & Document Formatting
    // ----------------------------------------------------
    const formattedHtml = `
      <div class="invoice">
        <h1>Invoice ${invoiceId}</h1>
        <p>Customer: ${req.body.customerId}</p>
        <p>Subtotal: $${(subtotalCents / 100).toFixed(2)}</p>
        <p>Tax: $${(taxCents / 100).toFixed(2)}</p>
        <h2>Total Due: $${(totalCents / 100).toFixed(2)}</h2>
      </div>
    `.trim();

    return {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        totalCents,
        htmlPreview: formattedHtml,
      }),
    };
  }

  getRawSql(invoiceId: string): string | undefined {
    return this.dbTable.get(invoiceId);
  }
}
