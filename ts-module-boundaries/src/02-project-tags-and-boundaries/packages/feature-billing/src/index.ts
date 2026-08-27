import type { User } from "../../domain/src/index.js";
import type { UserService } from "../../application/src/index.js";

export interface Invoice {
  id: string;
  userId: string;
  amountCents: number;
  currency: string;
  status: "paid" | "pending";
}

export class BillingManager {
  constructor(private readonly userService: UserService) {}

  async billForTierUpgrade(userId: string, targetTier: User["tier"]): Promise<Invoice> {
    const user = await this.userService.getUser(userId);
    if (!user) {
      throw new Error(`Billing failed: User ${userId} not found`);
    }

    const priceMap: Record<User["tier"], number> = {
      free: 0,
      pro: 2900,
      enterprise: 9900,
    };

    const invoice: Invoice = {
      id: `inv-${Date.now()}-${userId}`,
      userId,
      amountCents: priceMap[targetTier] ?? 0,
      currency: "USD",
      status: "paid",
    };

    await this.userService.upgradeTier(userId, targetTier);
    return invoice;
  }
}
