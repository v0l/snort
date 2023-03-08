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
 *
 * @param {Subscriptions} sub
 * @param {any} opt
 * @returns
 */
export default function useSubscription(
  sub: Subscriptions | Array<Subscriptions> | null,
  options?: UseSubscriptionOptions
): UseSubscriptionState {
  const [state, dispatch] = useReducer(notesReducer, initStore);
  const [changeCounter, setChangeCounter] = useState<number>(0);

  useEffect(() => {
    if (sub) {
      dispatch({
        type: "END",
        end: false,
      });

      const subs = Array.isArray(sub) ? sub : [sub];
      for (const s of subs) {
        s.OnEvent = e => {
          dispatch({
            type: "EVENT",
            ev: e,
          });
        };

        s.OnEnd = c => {
          if (!(options?.leaveOpen ?? false)) {
            c.RemoveSubscription(s.Id);
            if (s.IsFinished()) {
              System.RemoveSubscription(s.Id);
            }
          }
          dispatch({
            type: "END",
            end: true,
          });
        };

        System.AddSubscription(s);
      }
      return () => {
        for (const s of subs) {
          s.OnEvent = () => undefined;
          System.RemoveSubscription(s.Id);
        }
      };
    }
  }, [sub]);

  useEffect(() => {
    return debounce(500, () => {
      setChangeCounter(c => (c += 1));
    });
  }, [state]);

  return useMemo(() => {
    return {
      store: state,
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
  }, [changeCounter]);
}
