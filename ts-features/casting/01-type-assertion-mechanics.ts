/**
 * 01-type-assertion-mechanics.ts
 *
 * Demonstrates the underlying mechanics of TypeScript Type Assertions:
 * - Upcasting (Widening)
 * - Downcasting (Narrowing)
 * - The "Sufficient Overlap" Rule (Structural Compatibility)
 * - Compile-time Error TS2352 on disjoint types
 * - Zero-runtime code emission (Type Erasure)
 */

// ============================================================================
// 1. Model Definitions
// ============================================================================

export interface Entity {
  id: string;
}

export interface User extends Entity {
  email: string;
  role: "admin" | "member";
}

export interface AdminUser extends User {
  role: "admin";
  permissions: string[];
}

export interface Product {
  sku: string;
  priceCents: number;
}

// ============================================================================
// 2. Upcasting (Subtype -> Supertype)
// ============================================================================

export function demonstrateUpcasting(): { original: AdminUser; asserted: Entity } {
  const admin: AdminUser = {
    id: "usr_9981",
    email: "root@example.com",
    role: "admin",
    permissions: ["system:write", "users:delete"],
  };

  // ✅ ATTENTION: Upcasting is always safe because AdminUser structurally contains Entity.
  // In fact, TypeScript allows direct assignment without 'as', but 'as Entity' explicitly widens.
  const entity = admin as Entity;

  // 🔒 COMPILE-TIME: 'entity' is typed as Entity (only .id is directly accessible to TS)
  // 💥 RUNTIME REALITY: The underlying object STILL has email, role, and permissions at runtime!
  return { original: admin, asserted: entity };
}

// ============================================================================
// 3. Downcasting (Supertype -> Subtype)
// ============================================================================

export function demonstrateDowncasting(entity: Entity): User {
  // ⚠️ CRITICAL: Downcasting (Entity -> User) satisfies the overlap rule because Entity is a supertype.
  // The compiler trusts the developer that 'entity' actually has 'email' and 'role' at runtime.
  const user = entity as User;

  // 🔒 COMPILE-TIME: TypeScript permits accessing user.email
  return user;
}

// ============================================================================
// 4. The "Sufficient Overlap" Rule & Compile-Time Error TS2352
// ============================================================================

export function explainOverlapRule(): {
  overlappingAllowed: boolean;
  disjointRejected: boolean;
  explanation: string;
} {
  const rawData: unknown = { id: "p_100", sku: "SKU-99", priceCents: 4990 };

  // Overlap Scenario: Entity and Product
  // Notice that { id: string, sku: string, priceCents: number } overlaps with both.
  
  // ❌ FORBIDDEN in pure TS without intermediate top-type:
  // If you try to directly assert a primitive string as a number:
  // const invalid = ("hello" as number); 
  // --> Compiler Error TS2352: Conversion of type 'string' to type 'number' may be a mistake
  // because neither type sufficiently overlaps with the other.

  // Similarly, disjoint object shapes with NO shared structure are rejected:
  // const product = (entity as Product);
  // --> Compiler Error TS2352: Conversion of type 'Entity' to type 'Product' may be a mistake
  // because neither type sufficiently overlaps with the other. Property 'sku' is missing in type 'Entity'
  // but required in type 'Product'.

  return {
    overlappingAllowed: true,
    disjointRejected: true,
    explanation:
      "TypeScript requires type S to be assignable to T or T to be assignable to S. Disjoint types trigger TS2352.",
  };
}

// ============================================================================
// 5. Type Erasure: Compile-Time vs. Runtime Verification
// ============================================================================

export function demonstrateTypeErasure(): {
  input: string;
  runtimeType: string;
  assertedTypeLabel: string;
} {
  const stringValue: unknown = "12345";

  // ⚠️ CRITICAL: 'as number' does NOT parse or convert the string into a number!
  // In JavaScript, stringValue is still a string (typeof === 'string').
  // Zero bytecode/runtime instructions are generated for type assertions.
  const forcedNumber = stringValue as number;

  return {
    input: "12345",
    runtimeType: typeof forcedNumber, // Returns "string", NOT "number"!
    assertedTypeLabel: "number (compile-time type only)",
  };
}
