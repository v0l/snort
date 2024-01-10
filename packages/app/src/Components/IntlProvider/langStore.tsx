import {ExternalStore} from "@snort/shared";

class LangStore extends ExternalStore<string | null> {
  setLang(s: string) {
    localStorage.setItem("lang", s);
    this.notifyChange();
  }

  takeSnapshot() {
    return localStorage.getItem("lang");
  }
}

export const LangOverride = new LangStore();