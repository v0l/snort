import {default as NEvent} from "./Event"

export class NIP42AuthChallenge extends Event {
  challenge?:string
  relay?:string
  constructor(challenge:string, relay:string) {
    super("nip42auth");
    this.challenge = challenge;
    this.relay = relay;
  }
}

export class NIP42AuthResponse extends Event {
  event?: NEvent
  constructor(challenge: string, event: NEvent) {
    super(`nip42response:${challenge}`);
    this.event = event;
  }
}