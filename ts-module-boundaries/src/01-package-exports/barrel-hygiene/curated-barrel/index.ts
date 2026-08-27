/**
 * ✅ BEST PRACTICE: Curated Public API Surface
 * Explicitly names each exported value and type.
 * Private symbols (_secretHasher, INTERNAL_SECRET_KEY, internalDbConnection)
 * are excluded from the barrel file and never leak to consumers.
 */
export { PublicService } from "./internal-details.js";
export type { UserDTO } from "./internal-details.js";
