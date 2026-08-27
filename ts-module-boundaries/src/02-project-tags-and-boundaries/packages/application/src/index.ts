import type { User } from "../domain/src/index.js";

export interface UserService {
  getUser(id: string): Promise<User | null>;
  upgradeTier(userId: string, targetTier: User["tier"]): Promise<User>;
}

export class DefaultUserUseCase {
  constructor(private readonly service: UserService) {}

  async processUpgrade(userId: string, targetTier: User["tier"]): Promise<User> {
    const user = await this.service.getUser(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return this.service.upgradeTier(userId, targetTier);
  }
}
