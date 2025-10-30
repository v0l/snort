import { ExternalStore, unixNow } from "@snort/shared";
import { ReactNode, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { v4 as uuid } from "uuid";

import Icon from "@/Components/Icons/Icon";

interface ToastNotification {
  element: ReactNode | ((remove: () => void) => ReactNode);
  expire?: number;
  icon?: string;
  id?: string;
}

class ToasterSlots extends ExternalStore<Array<ToastNotification>> {
  #stack: Array<ToastNotification> = [];
  #cleanup = setInterval(() => this.#eatToast(), 1000);

  push(n: ToastNotification) {
    n.expire ??= unixNow() + 10;
    n.id ??= uuid();
    this.#stack.push(n);
    this.notifyChange();
  }

  takeSnapshot(): ToastNotification[] {
    return [...this.#stack];
  }

  remove(id?: string) {
    this.#stack = this.#stack.filter(a => a.id !== id);
    this.notifyChange();
  }

  #eatToast() {
    const now = unixNow();
    const newStack = this.#stack.filter(a => (a.expire ?? 0) > now);
    if (newStack.length !== this.#stack.length) {
      this.#stack = newStack;
      this.notifyChange();
    }
  }
}

export const Toastore = new ToasterSlots();

export default function Toaster() {
  const toast = useSyncExternalStore(
    c => Toastore.hook(c),
    () => Toastore.snapshot(),
  );

  return createPortal(
    <div className="fixed bottom-0.5 left-0.5 flex flex-col-reverse z-[9999] gap-1">
      {toast.map(a => (
        <div className="px-3 py-2 rounded-lg border gap-2 fade-in" key={a.id}>
          {a.icon && <Icon name={a.icon} />}
          {typeof a.element === "function" ? a.element(() => Toastore.remove(a.id)) : a.element}
        </div>
      ))}
    </div>,
    document.body,
  );
}
