/**
 * COMPLEXITY ANTI-PATTERNS (Triggers Oxlint / ESLint complexity warnings)
 *
 * Notice: These are syntactically valid TypeScript and execute properly,
 * but carry high cognitive burden, nesting hazards, and fragility during maintenance.
 */

export interface RawCustomerData {
  id?: string;
  profile?: {
    personal?: {
      contact?: {
        email?: string;
        isEmailVerified?: boolean;
      };
      name?: string;
    };
  };
  subscription?: {
    tier?: string;
    status?: string;
  };
}

/**
 * 1. HIGH CYCLOMATIC COMPLEXITY (> 5)
 * Cyclomatic complexity: ~9 (multiple if, else if, ternary, and logical conditions)
 */
export function calculateTangledDiscount(
  cartTotal: number,
  customerTier: "standard" | "gold" | "platinum",
  couponCode: string | null,
  loyaltyYears: number,
  isHolidayPromotion: boolean
): number {
  let discount = 0;

  if (customerTier === "platinum") {
    if (cartTotal > 500) {
      discount += 0.25;
    } else if (cartTotal > 200) {
      discount += 0.15;
    } else {
      discount += 0.10;
    }
  } else if (customerTier === "gold") {
    discount += cartTotal > 300 ? 0.12 : 0.08;
  } else {
    discount += cartTotal > 100 ? 0.05 : 0;
  }

  if (couponCode === "SAVE20" || (couponCode === "HOLIDAY" && isHolidayPromotion)) {
    discount += 0.20;
  } else if (couponCode === "LOYAL5" && loyaltyYears >= 5) {
    discount += 0.05;
  }

  return Math.min(discount, 0.50);
}

/**
 * 2. DEEP NESTING (> 3 levels of indentation / block depth)
 * Max Depth: 5 levels of nested blocks
 */
export function parseNestedCustomerEmail(data: RawCustomerData | null): string {
  let resolvedEmail = "none@example.com";

  if (data) {
    if (data.profile) {
      if (data.profile.personal) {
        if (data.profile.personal.contact) {
          if (data.profile.personal.contact.email) {
            if (data.profile.personal.contact.isEmailVerified) {
              resolvedEmail = data.profile.personal.contact.email.toLowerCase();
            }
          }
        }
      }
    }
  }

  return resolvedEmail;
}

/**
 * 3. PARAMETER BLOAT (> 3 positional parameters)
 * Max Params: 8 positional parameters
 */
export function createUserWithBloatedParameters(
  id: string,
  email: string,
  firstName: string,
  lastName: string,
  role: string,
  isActive: boolean,
  sendWelcomeEmail: boolean,
  referralCode: string | null
): Record<string, unknown> {
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
