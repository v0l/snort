import { ReactNode, useSyncExternalStore } from "react";
import { v4 as uuid } from "uuid";
import { ExternalStore, unixNow } from "@snort/shared";

import Icon from "Icons/Icon";
import "./Toaster.css";

interface ToastNotification {
  element: ReactNode;
  expire?: number;
  icon?: string;
  id?: string;
}

class ToasterSlots extends ExternalStore<Array<ToastNotification>> {
  #stack: Array<ToastNotification> = [];
  #cleanup = setInterval(() => this.#eatToast(), 1000);

  push(n: ToastNotification) {
    n.expire ??= unixNow() + 3;
    n.id ??= uuid();
    this.#stack.push(n);
    this.notifyChange();
  }

  takeSnapshot(): ToastNotification[] {
    return [...this.#stack];
  }

  #eatToast() {
    const now = unixNow();
    this.#stack = this.#stack.filter(a => (a.expire ?? 0) > now);
    this.notifyChange();
  }
}

export const Toastore = new ToasterSlots();

export default function Toaster() {
  const toast = useSyncExternalStore(
    c => Toastore.hook(c),
    () => Toastore.snapshot(),
  );

  return (
    <div className="toaster">
      {toast.map(a => (
        <div className="card flex" key={a.id}>
          <Icon name={a.icon ?? "bell"} className="mr5" />
          {a.element}
        </div>
      ))}
    </div>
  );
}
