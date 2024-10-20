import {
  EventPublisher,
  NostrLink,
  RequestBuilder,
  type NostrEvent,
  type SystemInterface,
  NostrPrefix,
  EventKind,
} from "@snort/system";
import EventEmitter from "eventemitter3";

export interface BotEvents {
  message: (msg: BotMessage) => void;
  event: (ev: NostrEvent) => void;
}

export interface BotMessage {
  link: NostrLink;
  from: string;
  message: string;
  event: NostrEvent;
  reply: (msg: string) => void;
}

export type CommandHandler = (msg: BotMessage) => void;

export class SnortBot extends EventEmitter<BotEvents> {
  #streams: Array<NostrLink> = [];
  #seen: Set<string> = new Set();
  #activeStreamSub: Set<string> = new Set();

  constructor(
    readonly name: string,
    readonly system: SystemInterface,
    readonly publisher: EventPublisher,
  ) {
    super();
    system.pool.on("event", (addr, sub, e) => {
      this.emit("event", e);
      if (e.kind === 30311) {
        const links = [e, ...this.activeStreams].map(v => NostrLink.fromEvent(v));
        const linkStr = links.map(e => e.encode());
        if (linkStr.every(a => this.#activeStreamSub.has(a))) {
          return;
        }
        const rb = new RequestBuilder("stream-chat");
        rb.withOptions({ replaceable: true, leaveOpen: true });
        rb.withFilter()
          .kinds([1311 as EventKind])
          .replyToLink(links)
          .since(Math.floor(new Date().getTime() / 1000));
        this.system.Query(rb);
        console.log("Looking for chat messages from: ", linkStr);
        this.#activeStreamSub = new Set(linkStr);
      } else if (e.kind === 1311) {
        // skip my own messages
        if (e.pubkey === this.publisher.pubKey) {
          return;
        }
        // skip already seen chat messages
        if (this.#seen.has(e.id)) {
          return;
        }
        this.#seen.add(e.id);
        const streamTag = e.tags.find(a => a[0] === "a" && a[1].startsWith("30311:"));
        if (streamTag) {
          const link = NostrLink.fromTag(streamTag);
          this.emit("message", {
            link,
            from: e.pubkey,
            message: e.content,
            event: e,
            reply: (msg: string) => {
              this.#sendReplyTo(link, msg);
            },
          });
        }
      }
    });
  }

  get activeStreams() {
    return (
      this.system.GetQuery("streams")?.snapshot?.filter(a => a.tags.find(b => b[0] === "status")?.at(1) === "live") ??
      []
    );
  }

  /**
   * Add a stream to listen on
   */
  link(a: NostrLink) {
    this.#streams.push(a);
    return this;
  }

  /**
   * Simple command handler
   */
  command(cmd: string, h: CommandHandler) {
    this.on("message", m => {
      if (m.message.startsWith(cmd)) {
        h(m);
      }
    });
    return this;
  }

  run() {
    const req = new RequestBuilder("streams");
    req.withOptions({ leaveOpen: true });
    for (const link of this.#streams) {
      if (link.type === NostrPrefix.PublicKey || link.type === NostrPrefix.Profile) {
        req.withFilter().authors([link.id]).kinds([30311]);
        req.withFilter().tag("p", [link.id]).kinds([30311]);
      } else if (link.type === NostrPrefix.Address) {
        const f = req.withFilter().tag("d", [link.id]);
        if (link.author) {
          f.authors([link.author]);
        }
        if (link.kind) {
          f.kinds([link.kind]);
        }
      }
    }

    this.system.Query(req);
    return this;
  }

  async #sendReplyTo(link: NostrLink, msg: string) {
    const ev = await this.publisher.generic(eb => {
      eb.kind(1311 as EventKind)
        .tag(link.toEventTag("root")!)
        .content(msg);
      return eb;
    });
    await this.system.BroadcastEvent(ev);
  }
}
