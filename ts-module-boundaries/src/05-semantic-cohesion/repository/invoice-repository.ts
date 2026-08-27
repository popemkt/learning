/**
 * COHESIVE MODULE 2: PERSISTENCE REPOSITORY
 *
 * Responsibilities:
 * - Data storage abstraction
 * - Serialization / SQL / Document mapping
 * - Querying by ID and customer
 */

import type { Invoice } from "../domain/invoice.js";

export interface InvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  findById(id: string): Promise<Invoice | null>;
  findByCustomerId(customerId: string): Promise<Invoice[]>;
}

export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly records = new Map<string, Invoice>();

  async save(invoice: Invoice): Promise<void> {
    this.records.set(invoice.id, { ...invoice });
  }

  async findById(id: string): Promise<Invoice | null> {
    const record = this.records.get(id);
    return record ? { ...record } : null;
  }

  async findByCustomerId(customerId: string): Promise<Invoice[]> {
    const results: Invoice[] = [];
    for (const inv of this.records.values()) {
      if (inv.customerId === customerId) {
        results.push({ ...inv });
      }
    }
    return results;
  }
}
