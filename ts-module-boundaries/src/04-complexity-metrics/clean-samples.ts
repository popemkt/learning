/**
 * CLEAN REFACTORED SAMPLES (Passes Oxlint / ESLint complexity checks cleanly)
 *
 * Strategies demonstrated:
 * 1. Data-driven / lookup tables to reduce cyclomatic branching.
 * 2. Guard clauses / optional chaining to eliminate arrow-head deep nesting.
 * 3. Parameter / Options DTO objects to eradicate positional parameter bloat.
 */

import type { RawCustomerData } from "./complex-samples.js";

export interface CreateUserOptions {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  isActive?: boolean;
  sendWelcomeEmail?: boolean;
  referralCode?: string | null;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  welcomeSent: boolean;
  referral: string | null;
}

const TIER_DISCOUNT_RATES: Record<string, { highThreshold: number; highRate: number; midRate: number; baseRate: number }> = {
  platinum: { highThreshold: 500, highRate: 0.25, midRate: 0.15, baseRate: 0.10 },
  gold: { highThreshold: 300, highRate: 0.12, midRate: 0.08, baseRate: 0.08 },
  standard: { highThreshold: 100, highRate: 0.05, midRate: 0, baseRate: 0 },
};

/**
 * 1. CLEAN CYCLOMATIC COMPLEXITY (Complexity: 2)
 * Refactored using lookup tables and declarative rules.
 */
export function calculateCleanDiscount(
  cartTotal: number,
  customerTier: "standard" | "gold" | "platinum",
  couponBonus: number = 0
): number {
  const tierConfig = TIER_DISCOUNT_RATES[customerTier] ?? TIER_DISCOUNT_RATES.standard;
  const baseRate = cartTotal > tierConfig.highThreshold
    ? tierConfig.highRate
    : tierConfig.baseRate;

  return Math.min(baseRate + couponBonus, 0.50);
}

/**
 * 2. SHALLOW FLATTENED NESTING (Max Depth: 1)
 * Refactored using safe optional chaining and guard clauses.
 */
export function parseCleanCustomerEmail(data: RawCustomerData | null): string {
  const contact = data?.profile?.personal?.contact;
  if (!contact?.isEmailVerified || !contact.email) {
    return "none@example.com";
  }
  return contact.email.toLowerCase();
}

/**
 * 3. CLEAN PARAMETER OBJECT (Params: 1)
 * Refactored from 8 positional arguments to a single cohesive options object.
 */
export function createCleanUser(options: CreateUserOptions): UserSummary {
  const {
    id,
    email,
    firstName,
    lastName,
    role = "viewer",
    isActive = true,
    sendWelcomeEmail = false,
    referralCode = null,
  } = options;

  return {
    id,
    email,
    fullName: `${firstName} ${lastName}`,
    role,
    isActive,
    welcomeSent: sendWelcomeEmail,
    referral: referralCode,
  };
}
