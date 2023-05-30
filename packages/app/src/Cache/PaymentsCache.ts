import { Payment, db } from "Db";
import FeedCache from "./FeedCache";

class Payments extends FeedCache<Payment> {
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

export const PaymentsCache = new Payments();
