import { MetadataCache } from "@snort/system";

export interface UITask {
  id: string;
  /**
   * Run checks to determine if this Task should be triggered for this user
   */
  check(user: MetadataCache): boolean;
  mute(): void;
  load(): void;
  render(): JSX.Element;
}

export interface UITaskState {
  id: string;
  muted: boolean;
  completed: boolean;
}

export abstract class BaseUITask implements UITask {
  protected state: UITaskState;

  abstract id: string;
  abstract check(user: MetadataCache): boolean;
  abstract render(): JSX.Element;

  constructor() {
    this.state = {} as UITaskState;
  }

  mute(): void {
    this.state.muted = true;
    this.#save();
  }

  load() {
    const state = window.localStorage.getItem(`task:${this.id}`);
    if (state) {
      this.state = JSON.parse(state);
    }
  }

  #save() {
    window.localStorage.setItem(`task:${this.id}`, JSON.stringify(this.state));
  }
}
