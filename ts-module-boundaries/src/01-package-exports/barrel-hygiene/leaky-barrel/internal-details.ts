/**
 * Internal implementation file containing both public service logic
 * and private/internal helpers that should NOT be part of the public API surface.
 */

export class PublicService {
  execute(input: string): string {
    const hashed = _secretHasher(input);
    return `[PublicService] Processed: ${input} (hash: ${hashed})`;
  }
}

/**
 * 🚨 Leaked internal helper: Never intended for external consumers!
 */
export function _secretHasher(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * 🚨 Leaked internal configuration key and connection helper
 */
export const INTERNAL_SECRET_KEY = "DEV_SYS_KEY_PRIVATE_9981";

export function internalDbConnection(): string {
  return "postgresql://internal_admin:supersecret@localhost:5432/core_db";
}

export interface UserDTO {
  id: string;
  username: string;
  role: "admin" | "member";
}

export interface InternalRawDbRecord {
  _row_id: number;
  _raw_byte_offset: number;
  _checksum: string;
}
