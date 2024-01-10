import {ExternalStore} from "@snort/shared";

class CommunityLeadersStore extends ExternalStore<Array<string>> {
  #leaders: Array<string> = [];

  setLeaders(arr: Array<string>) {
    this.#leaders = arr;
    this.notifyChange();
  }

  takeSnapshot(): string[] {
    return [...this.#leaders];
  }
}

export const LeadersStore = new CommunityLeadersStore();