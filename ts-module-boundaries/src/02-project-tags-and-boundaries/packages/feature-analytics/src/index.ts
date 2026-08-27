import type { User } from "../../domain/src/index.js";

export interface AnalyticsEvent {
  eventName: string;
  userId: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export class AnalyticsTracker {
  private readonly events: AnalyticsEvent[] = [];

  trackUserAction(user: User, action: string, metadata: Record<string, unknown> = {}): AnalyticsEvent {
    const event: AnalyticsEvent = {
      eventName: action,
      userId: user.id,
      metadata: {
        ...metadata,
        tier: user.tier,
      },
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  getEventsForUser(userId: string): AnalyticsEvent[] {
    return this.events.filter(e => e.userId === userId);
  }
}
