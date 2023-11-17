import { FeedCache } from "@snort/shared";
import { db, EventInteraction } from "@/Db";
import { LoginStore } from "@/Login";
import { sha256 } from "@/SnortUtils";

export class EventInteractionCache extends FeedCache<EventInteraction> {
  constructor() {
    super("EventInteraction", db.eventInteraction);
  }

  key(of: EventInteraction): string {
    return sha256(of.event + of.by);
  }

  override async preload(): Promise<void> {
    await super.preload();

    const data = window.localStorage.getItem("zap-cache");
    if (data) {
      const toImport = [...new Set<string>(JSON.parse(data) as Array<string>)].map(a => {
        const ret = {
          event: a,
          by: LoginStore.takeSnapshot().publicKey,
          zapped: true,
          reacted: false,
          reposted: false,
        } as EventInteraction;
        ret.id = this.key(ret);
        return ret;
      });
      await this.bulkSet(toImport);

      console.debug(`Imported dumb-zap-cache events: `, toImport.length);
      window.localStorage.removeItem("zap-cache");
    }
    await this.buffer([...this.onTable]);
  }

  takeSnapshot(): EventInteraction[] {
    return [...this.cache.values()];
  }
}
