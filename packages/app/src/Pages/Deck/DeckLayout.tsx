import type { NostrLink, TaggedNostrEvent } from "@snort/system";
import { createContext, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useLocation, useNavigate } from "react-router-dom";

import ErrorBoundary from "@/Components/ErrorBoundary";
import { LongFormText } from "@/Components/Event/LongFormText";
import Modal from "@/Components/Modal/Modal";
import { SpotlightThreadModal } from "@/Components/Spotlight/SpotlightThreadModal";
import Toaster from "@/Components/Toaster/Toaster";
import useLoginFeed from "@/Feed/LoginFeed";
import useLogin from "@/Hooks/useLogin";
import { useLoginRelays } from "@/Hooks/useLoginRelays";
import usePreferences from "@/Hooks/usePreferences";
import { useTheme } from "@/Hooks/useTheme";
import { ArticlesCol, MediaCol, NotesCol, NotificationsCol } from "@/Pages/Deck/Columns";
import NavSidebar from "@/Pages/Layout/NavSidebar";
import { mapPlanName } from "@/Pages/subscribe/utils";
import { trackEvent } from "@/Utils";
import { getCurrentSubscription } from "@/Utils/Subscription";

type Cols = "notes" | "articles" | "media" | "streams" | "notifications";

interface DeckState {
  thread?: NostrLink;
  article?: TaggedNostrEvent;
}

interface DeckScope {
  setThread: (e?: NostrLink) => void;
  setArticle: (e?: TaggedNostrEvent) => void;
  reset: () => void;
}

export const DeckContext = createContext<DeckScope | undefined>(undefined);

export function SnortDeckLayout() {
  const location = useLocation();
  const login = useLogin(s => ({
    publicKey: s.publicKey,
    subscriptions: s.subscriptions,
  }));
  const telemetry = usePreferences(s => s.telemetry);
  const navigate = useNavigate();
  const [deckState, setDeckState] = useState<DeckState>({
    thread: undefined,
    article: undefined,
  });
  const sub = getCurrentSubscription(login.subscriptions);

  useLoginFeed();
  useTheme();
  useLoginRelays();

  useEffect(() => {
    if (!login.publicKey) {
      navigate("/");
    }
  }, [login]);

  useEffect(() => {
    if (CONFIG.features.analytics && (telemetry ?? true)) {
      trackEvent("pageview");
    }
  }, [location]);

  if (!login.publicKey) return null;
  const showDeck = CONFIG.showDeck || !(CONFIG.deckSubKind !== undefined && (sub?.type ?? -1) < CONFIG.deckSubKind);
  if (!showDeck) {
    return (
      <div className="deck-layout">
        <NavSidebar narrow={true} />
        <div>
          <div className="flex flex-col gap-2 m-2 bg-dark px-3 py-2 rounded-lg">
            <div className="text-xl font-bold">
              <FormattedMessage
                defaultMessage="You must be a {tier} subscriber to access {app} deck"
                id="IOu4Xh"
                values={{
                  app: CONFIG.appNameCapitalized,
                  tier: mapPlanName(CONFIG.deckSubKind ?? -1),
                }}
              />
            </div>
            <div>
              <Link to="/subscribe">
                <button>
                  <FormattedMessage defaultMessage="Subscribe" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const cols = ["notes", "media", "notifications", "articles"] as Array<Cols>;
  return (
    <div className="deck-layout">
      <DeckContext.Provider
        value={{
          ...deckState,
          setThread: (e?: NostrLink) => setDeckState({ thread: e }),
          setArticle: (e?: TaggedNostrEvent) => setDeckState({ article: e }),
          reset: () => setDeckState({}),
        }}>
        <NavSidebar narrow={true} />
        <ErrorBoundary>
          <div className="deck-cols">
            {cols.map(c => {
              switch (c) {
                case "notes":
                  return <NotesCol />;
                case "media":
                  return <MediaCol setThread={t => setDeckState({ thread: t })} />;
                case "articles":
                  return <ArticlesCol />;
                case "notifications":
                  return <NotificationsCol setThread={t => setDeckState({ thread: t })} />;
              }
            })}
          </div>
          {deckState.thread && (
            <SpotlightThreadModal
              thread={deckState.thread}
              onClose={() => setDeckState({})}
              onBack={() => setDeckState({})}
            />
          )}
          {deckState.article && (
            <>
              <Modal
                id="deck-article"
                onClose={() => setDeckState({})}
                className="long-form"
                onClick={() => setDeckState({})}>
                <div onClick={e => e.stopPropagation()}>
                  <LongFormText ev={deckState.article} isPreview={false} />
                </div>
              </Modal>
            </>
          )}
          <Toaster />
        </ErrorBoundary>
      </DeckContext.Provider>
    </div>
  );
}
