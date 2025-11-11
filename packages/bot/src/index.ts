import {
  EventPublisher,
  NostrLink,
  RequestBuilder,
  NostrEvent,
  SystemInterface,
  EventKind,
  TaggedNostrEvent,
  NostrSystem,
  PrivateKeySigner,
  UserMetadata,
  Nip10,
  LinkScope,
} from "@snort/system";
import { NostrPrefix } from "@snort/shared";
import EventEmitter from "eventemitter3";

export interface BotEvents {
  message: (msg: BotMessage) => void;
  event: (ev: NostrEvent) => void;
}

export interface BotMessage {
  /**
   * Event which this message belongs to
   */
  link: NostrLink;
  /**
   * Pubkey of the message author
   */
  from: string;
  /**
   * Message content string
   */
  message: string;
  /**
   * Original message event
   */
  event: NostrEvent;
  /**
   * Reply handler for this message
   */
  reply: (msg: string) => Promise<void>;
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
  }

  /**
   * Create a new simple bot
   */
  static simple(name: string) {
    const system = new NostrSystem({});
    const signer = PrivateKeySigner.random();
    return new SnortBot(name, system, new EventPublisher(signer, signer.getPubKey()));
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
   * Add a relay for communication
   */
  relay(r: string) {
    this.system.ConnectToRelay(r, { read: true, write: true });
    return this;
  }

  /**
   * Create a profile
   */
  profile(p: UserMetadata) {
    this.publisher.metadata(p).then(ev => this.system.BroadcastEvent(ev));
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

  /**
   * Start the bot
   */
  run() {
    const req = new RequestBuilder("streams");
    req.withOptions({ leaveOpen: true });
    for (const link of this.#streams) {
      if (link.type === NostrPrefix.PublicKey || link.type === NostrPrefix.Profile) {
        req.withFilter().authors([link.id]).kinds([30311]);
        req.withFilter().tag("p", [link.id]).kinds([30311]);
      } else {
        req.withFilter().link(link);
      }
    }

    // requst streams by input links
    const q = this.system.Query(req);
    q.on("event", evs => {
      for (const e of evs) {
        this.#handleEvent(e);
      }
    });
    q.start();

    // setup chat query, its empty for now
    const rbChat = new RequestBuilder("stream-chat");
    rbChat.withOptions({ replaceable: true, leaveOpen: true });
    const qChat = this.system.Query(rbChat);
    qChat.on("event", evs => {
      for (const e of evs) {
        this.#handleEvent(e);
      }
    });
    qChat.start();

    return this;
  }

  /**
   * Send a message to all active streams
   */
  async notify(msg: string) {
    for (const stream of this.activeStreams) {
      const ev = await this.publisher.reply(stream, msg, eb => {
        return eb.kind(1311 as EventKind);
      });
      await this.system.BroadcastEvent(ev);
    }
  }

  #handleEvent(e: TaggedNostrEvent) {
    this.emit("event", e);
    if (e.kind === 30311) {
      this.#checkActiveStreams(e);
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
          reply: (msg: string) => this.#sendReplyTo(link, msg),
        });
      }
    }
  }

  #checkActiveStreams(e: TaggedNostrEvent) {
    const links = [e, ...this.activeStreams].map(v => NostrLink.fromEvent(v));
    const linkStr = [...new Set(links.map(e => e.encode()))];
    if (linkStr.every(a => this.#activeStreamSub.has(a))) {
      return;
    }

    const rb = new RequestBuilder("stream-chat");
    rb.withFilter()
      .kinds([1311 as EventKind])
      .replyToLink(links)
      .since(Math.floor(new Date().getTime() / 1000));
    const q = this.system.Query(rb);
    q.start();

    console.log("Looking for chat messages from: ", linkStr);
    this.#activeStreamSub = new Set(linkStr);
  }

  async #sendReplyTo(link: NostrLink, msg: string) {
    const ev = await this.publisher.generic(eb => {
      eb.kind(1311 as EventKind)
        .tag(Nip10.linkToTag(link, LinkScope.Root))
        .content(msg);
      return eb;
    });
    await this.system.BroadcastEvent(ev);
  }
}
