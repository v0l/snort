import { FeedCache } from "@snort/shared";

import { db,Payment } from "@/Db";

export class Payments extends FeedCache<Payment> {
  constructor() {
    super("PaymentsCache", db.payments);
  }

  key(of: Payment): string {
    return of.url;
  }

  takeSnapshot(): Array<Payment> {
    return [...this.cache.values()];
  }
}
