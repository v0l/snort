import { useEffect, useMemo, useReducer, useState } from "react";
import { TaggedRawEvent } from "@snort/nostr";
import { Subscriptions } from "@snort/nostr";
import { System } from "System";
import { debounce } from "Util";

export type NoteStore = {
  notes: Array<TaggedRawEvent>;
  end: boolean;
};

export type UseSubscriptionOptions = {
  leaveOpen: boolean;
  cache: boolean;
  relay?: string;
};

interface ReducerArg {
  type: "END" | "EVENT" | "CLEAR";
  ev?: TaggedRawEvent | TaggedRawEvent[];
  end?: boolean;
}

function notesReducer(state: NoteStore, arg: ReducerArg) {
  if (arg.type === "END") {
    return {
      notes: state.notes,
      end: arg.end ?? true,
    } as NoteStore;
  }

  if (arg.type === "CLEAR") {
    return {
      notes: [],
      end: state.end,
    } as NoteStore;
  }

  let evs = arg.ev;
  if (!(evs instanceof Array)) {
    evs = evs === undefined ? [] : [evs];
  }
  const existingIds = new Set(state.notes.map(a => a.id));
  evs = evs.filter(a => !existingIds.has(a.id));
  if (evs.length === 0) {
    return state;
  }
  return {
    notes: [...state.notes, ...evs],
  } as NoteStore;
}

const initStore: NoteStore = {
  notes: [],
  end: false,
};

export interface UseSubscriptionState {
  store: NoteStore;
  clear: () => void;
  append: (notes: TaggedRawEvent[]) => void;
}

/**
 * Wait time before returning changed state
 */
const DebounceMs = 200;

/**
 *
 * @param {Subscriptions} sub
 * @param {any} opt
 * @returns
 */
export default function useSubscription(
  sub: Subscriptions | null,
  options?: UseSubscriptionOptions
): UseSubscriptionState {
  const [state, dispatch] = useReducer(notesReducer, initStore);
  const [debounceOutput, setDebounceOutput] = useState<number>(0);
  const [subDebounce, setSubDebounced] = useState<Subscriptions>();

  useEffect(() => {
    if (sub) {
      return debounce(DebounceMs, () => {
        setSubDebounced(sub);
      });
    }
  }, [sub, options]);

  useEffect(() => {
    if (subDebounce) {
      dispatch({
        type: "END",
        end: false,
      });

      subDebounce.OnEvent = e => {
        dispatch({
          type: "EVENT",
          ev: e,
        });
      };

      subDebounce.OnEnd = c => {
        if (!(options?.leaveOpen ?? false)) {
          c.RemoveSubscription(subDebounce.Id);
          if (subDebounce.IsFinished()) {
            System.RemoveSubscription(subDebounce.Id);
          }
        }
        dispatch({
          type: "END",
          end: true,
        });
      };

      const subObj = subDebounce.ToObject();
      console.debug("Adding sub: ", subObj);
      if (options?.relay) {
        System.AddSubscriptionToRelay(subDebounce, options.relay);
      } else {
        System.AddSubscription(subDebounce);
      }
      return () => {
        console.debug("Removing sub: ", subObj);
        subDebounce.OnEvent = () => undefined;
        System.RemoveSubscription(subDebounce.Id);
      };
    }
  }, [subDebounce]);

  useEffect(() => {
    return debounce(DebounceMs, () => {
      setDebounceOutput(s => (s += 1));
    });
  }, [state]);

  const stateDebounced = useMemo(() => state, [debounceOutput]);
  return {
    store: stateDebounced,
    clear: () => {
      dispatch({ type: "CLEAR" });
    },
    append: (n: TaggedRawEvent[]) => {
      dispatch({
        type: "EVENT",
        ev: n,
      });
    },
  };
}
