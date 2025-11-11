import { isHex, sanitizeRelayUrl } from "@snort/shared";
import { EventSigner } from "../signer";
import { EventBuilder } from "../event-builder";
import { NostrEvent, TaggedNostrEvent } from "../nostr";
import { SystemInterface } from "../system";
import { RequestBuilder } from "../request-builder";
import { NostrLink } from "../nostr-link";
import { findTag } from "../utils";
import debug from "debug";
import EventEmitter from "eventemitter3";
import { v4 as uuid } from "uuid";

export enum DVMJobState {
  /**
   * Job is new and never sent to any relays
   */
  New = "new",

  /**
   * Job was sent to relays
   */
  Init = "init",

  /**
   * DVM server requested payment
   */
  PaymentRequired = "payment-required",

  /**
   * DVM server is processing the request
   */
  Processing = "processing",

  /**
   * DVM server was unable to process the request
   */
  Error = "error",

  /**
   * DVM job was successful
   */
  Success = "success",

  /**
   * The job was partially completed
   */
  Partial = "partial",
}

/**
 * Events emitted by the DVM job
 */
export interface DVMJobEvents {
  /**
   * Job state changed
   */
  state(newState: DVMJobState): void;

  /**
   * DVM server requested payment
   */
  paymentRequested(): void;

  /**
   * DVM server returned an error
   */
  error(message?: string): void;

  /**
   * Job was successful
   */
  result(ev: TaggedNostrEvent): void;
}

/**
 * Job input params
 */
export interface DVMJobInput {
  /**
   * The argument for the input
   */
  data: string;

  /**
   * The way this argument should be interpreted
   */
  inputType: "url" | "event" | "job" | "text";

  /**
   * If event or job input-type, the relay where the event/job was published, otherwise optional or empty string
   */
  relay?: string;

  /**
   * An optional field indicating how this input should be used within the context of the job
   */
  marker?: string;
}

/**
 * Generic DVM job request class
 */
export class DVMJobRequest extends EventEmitter<DVMJobEvents> {
  private log = debug("NIP-90");

  /**
   * Internal instance ID
   */
  #id = uuid();

  /**
   * Internal job state
   */
  #state = DVMJobState.New;

  /**
   * Internal job event sent to relays
   */
  #jobEvent?: NostrEvent;

  /**
   * Job request kind number
   */
  readonly kind: number;

  /**
   * The response kind used to reply to this job
   */
  readonly responseKind: number;

  /**
   *  Input data for the job (zero or more inputs)
   */
  private input?: Array<DVMJobInput>;

  /**
   * Param tags K/V
   */
  private params?: Map<string, string>;

  /**
   * Expected output format. Different job request kind defines this more precisely
   */
  private output?: string;

  /**
   * Customer MAY specify a maximum amount (in millisats) they are willing to pay
   */
  private bid?: number;

  /**
   * List of relays where Service Providers SHOULD publish responses to
   */
  private relays?: Set<string>;

  /**
   * Service Providers the customer is interested in. Other SPs MIGHT still choose to process the job
   */
  private serviceProvider?: string;

  /**
   * If encryption is enabled
   */
  private encrypted: boolean;

  constructor(kind: number, response?: number) {
    super();
    this.kind = kind;
    this.responseKind = response ?? 6000 + (kind - 5000);
    this.encrypted = false;
  }

  /**
   * Get the instance ID
   */
  get id() {
    return this.#id;
  }

  get state() {
    return this.#state;
  }

  private set state(v: DVMJobState) {
    this.#state = v;
    this.emit("state", v);
  }

  /**
   * Add an input for the job request
   */
  addInput(input: DVMJobInput) {
    this.input ??= [];
    this.input.push(input);
    return this;
  }

  /**
   * Set a param for the request
   * @param k The param name
   * @param v The param value
   */
  setParam(k: string, v: string) {
    this.params ??= new Map();
    this.params.set(k, v);
    return this;
  }

  /**
   * Remove a param from the job request
   */
  removeParam(k: string) {
    this.params?.delete(k);
    return this;
  }

  /**
   * Set to use encryption for the inputs / params
   */
  setEncrypted(encrypted: boolean) {
    this.encrypted = encrypted;
    return this;
  }

  /**
   * Set the service provider pubkey
   */
  setServiceProvider(p: string) {
    if (p.length !== 64 || !isHex(p)) {
      throw new Error("Provider must be a hex pubkey");
    }
    this.serviceProvider = p;
    return this;
  }

  /**
   * Set the desired output MIME
   */
  setOutput(mime: string) {
    this.output = mime;
    return this;
  }

  /**
   * Set the bid amount in milli-sats
   */
  setBid(amount: number) {
    this.bid = amount;
    return this;
  }

  /**
   * Add a relay where the job feedback / results should be sent
   */
  addRelay(relay: string) {
    this.relays ??= new Set();
    const cleaned = sanitizeRelayUrl(relay);
    if (!cleaned) {
      throw new Error("Invalid relay URL");
    }
    this.relays.add(cleaned);
    return this;
  }

  /**
   * Remove a relay
   */
  removeRelay(relay: string) {
    const cleaned = sanitizeRelayUrl(relay);
    if (cleaned) {
      this.relays?.delete(cleaned);
    }
    return this;
  }

  /**
   * Build the final job request Nostr event
   */
  async buildEvent(signer: EventSigner): Promise<NostrEvent> {
    const inputTags = [];
    for (const input of this.input ?? []) {
      const iTag = ["i", input.data, input.inputType];
      if (input.relay) {
        iTag.push(input.relay);
      }
      if (input.marker) {
        iTag.push(input.marker);
      }
      inputTags.push(iTag);
    }
    for (const [k, v] of this.params?.entries() ?? []) {
      inputTags.push(["param", k, v]);
    }
    const otherTags = [];
    if (this.output) {
      otherTags.push(["output", this.output]);
    }
    if (this.bid) {
      otherTags.push(["bid", this.bid.toString()]);
    }
    if (this.relays && this.relays.size > 0) {
      otherTags.push(["relays", ...this.relays]);
    }
    if (this.serviceProvider) {
      otherTags.push(["p", this.serviceProvider]);
    }
    if (this.encrypted) {
      if (!this.serviceProvider) {
        throw new Error("Cannot encrypt job without service provider pubkey");
      }
      otherTags.push(["encrypted", "1"]);
    }

    const pubkey = await signer.getPubKey();
    const eb = new EventBuilder().pubKey(pubkey).kind(this.kind);
    if (this.encrypted) {
      for (const t of otherTags) {
        eb.tag(t);
      }
      const tagsEncrypted = JSON.stringify(inputTags);
      eb.content(await signer.nip44Encrypt(tagsEncrypted, this.serviceProvider!));
    } else {
      for (const t of [...inputTags, ...otherTags]) {
        eb.tag(t);
      }
    }
    return await eb.buildAndSign(signer);
  }

  #handleReplyEvents(evs: Array<TaggedNostrEvent>) {
    for (const e of evs) {
      this.log("Processing response: %O", e);
      if (e.kind === 7000) {
        const status = findTag(e, "status");
        switch (status?.toLocaleLowerCase()) {
          case "error": {
            this.state = DVMJobState.Error;
            this.emit("error", "Request failed");
            break;
          }
          case "processing": {
            this.state = DVMJobState.Processing;
            break;
          }
          case "partial": {
            this.state = DVMJobState.Partial;
            break;
          }
          case "success": {
            this.state = DVMJobState.Success;
            break;
          }
          default: {
            this.log("Unknown feedback status: %s", status);
          }
        }
        return;
      } else if (e.kind === this.responseKind) {
        if (this.serviceProvider && this.serviceProvider !== e.pubkey) {
          return; // another DVM replied to our request, ignore
        }
        const jobLink = NostrLink.fromEvent(this.#jobEvent!);
        if (jobLink.isReplyToThis(e)) {
          this.state = DVMJobState.Success;
          this.emit("result", e);
        }
      }
    }
  }

  /**
   * Start job request flow
   * @param signer Signer to sign job request events
   * @param system System to send / receive events
   * @param relays List of specific relays to send requests on
   */
  async request(signer: EventSigner, system: SystemInterface, relays?: Array<string>) {
    if (this.state !== DVMJobState.New) {
      throw new Error("Invalid job state, cannot send request");
    }
    this.#jobEvent = await this.buildEvent(signer);
    this.state = DVMJobState.Init;

    // sub to replies first
    const rbReply = new RequestBuilder(`dvm-replies:${this.#jobEvent.id}`);
    rbReply.withOptions({ leaveOpen: true });
    const f = rbReply.withFilter().kinds([this.responseKind, 7000]).tag("e", [this.#jobEvent.id]);

    // list for replies on the reply relays if specified
    if (this.relays && this.relays.size > 0) {
      f.relay([...this.relays]);
    }

    const q = system.Query(rbReply);
    q.uncancel(); // might already exist so uncancel
    q.on("event", evs => this.#handleReplyEvents(evs));
    q.start();

    // send request
    if (relays) {
      for (const r of relays) {
        await system.WriteOnceToRelay(r, this.#jobEvent);
      }
    } else {
      await system.BroadcastEvent(this.#jobEvent);
    }

    // abort self when resut
    this.on("result", () => {
      q.cancel();
    });
    return q;
  }

  abort(system: SystemInterface) {
    if (this.#jobEvent) {
      const q = system.GetQuery(`dvm-replies:${this.#jobEvent.id}`);
      q?.cancel();
    }
  }
}
