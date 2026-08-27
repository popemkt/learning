export interface User {
  id: string;
  email: string;
  tier: "free" | "pro" | "enterprise";
}

export function validateUserTier(user: User): boolean {
  return ["free", "pro", "enterprise"].includes(user.tier);
}
