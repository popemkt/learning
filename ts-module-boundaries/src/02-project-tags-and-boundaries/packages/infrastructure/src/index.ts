import type { User } from "../../domain/src/index.js";
import type { UserService } from "../../application/src/index.js";

export class InMemoryUserRepository implements UserService {
  private readonly users = new Map<string, User>();

  constructor(initialUsers: User[] = []) {
    for (const u of initialUsers) {
      this.users.set(u.id, u);
    }
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async upgradeTier(userId: string, targetTier: User["tier"]): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} does not exist in repository`);
    }
    const updated: User = { ...user, tier: targetTier };
    this.users.set(userId, updated);
    return updated;
  }
}
