import { bech32ToHex, unixNowMs } from "@snort/shared";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo } from "react";

import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import usePreferences from "@/Hooks/usePreferences";
import { System } from "@/system";
import { unwrap } from "@/Utils";
import { SnortPubKey } from "@/Utils/Const";
import { addSubscription } from "@/Utils/Login";
import { SubscriptionEvent } from "@/Utils/Subscription";

/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
  const login = useLogin();
  const { publicKey: pubKey } = login;
  const checkSigs = usePreferences(s => s.checkSigs);
  const { publisher, system } = useEventPublisher();

  useEffect(() => {
    system.checkSigs = checkSigs;
  }, [system, checkSigs]);

  useEffect(() => {
    if (pubKey) {
      const start = unixNowMs();
      system.config.socialGraphInstance.setRoot(pubKey);
      console.debug(
        `Social graph loaded in ${(unixNowMs() - start).toFixed(2)}ms`,
        System.config.socialGraphInstance.size(),
      );
    }
  }, [pubKey]);

  useEffect(() => {
    console.debug("UserState: start init from LoginFeed", login.state.didInit);
    login.state.init(publisher?.signer, system).catch(console.error);
  }, [login, publisher, system]);

  const subLogin = useMemo(() => {
    const b = new RequestBuilder(`login:sub`);
    b.withOptions({
      leaveOpen: true,
    });
    if (CONFIG.features.subscriptions && !login.readonly) {
      if (pubKey) {
        b.withFilter()
          .relay("wss://relay.snort.social/")
          .kinds([EventKind.SnortSubscriptions])
          .authors([bech32ToHex(SnortPubKey)])
          .tag("p", [pubKey])
          .limit(10);
      }
    }
    return b;
  }, [pubKey, login]);

  const loginFeed = useRequestBuilder(subLogin);

  // update relays and follow lists
  useEffect(() => {
    if (loginFeed && publisher) {
      const subs = loginFeed.filter(
        a => a.kind === EventKind.SnortSubscriptions && a.pubkey === bech32ToHex(SnortPubKey),
      );
      Promise.all(
        subs.map(async a => {
          const dx = await publisher.decryptDm(a);
          if (dx) {
            const ex = JSON.parse(dx);
            return {
              id: a.id,
              ...ex,
            } as SubscriptionEvent;
          }
        }),
      ).then(a => addSubscription(login, ...a.filter(a => a !== undefined).map(unwrap)));
    }
  }, [login, loginFeed, publisher]);

  useEffect(() => {
    system.profileLoader.TrackKeys(login.state.follows ?? []); // always track follows profiles
  }, [system, login.state.follows]);
}
