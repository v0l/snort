import "./Deck.css";
import { createContext, useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { NostrLink, TaggedNostrEvent } from "@snort/system";

import useLoginFeed from "@/Feed/LoginFeed";
import { useLoginRelays } from "@/Hooks/useLoginRelays";
import { useTheme } from "@/Hooks/useTheme";
import Articles from "@/Components/Feed/Articles";
import TimelineFollows from "@/Components/Feed/TimelineFollows";
import { transformTextCached } from "@/Hooks/useTextTransformCache";
import Icon from "@/Components/Icons/Icon";
import NotificationsPage from "./Notifications/Notifications";
import Modal from "@/Components/Modal/Modal";
import { RootTabs } from "@/Components/Feed/RootTabs";
import Toaster from "@/Components/Toaster/Toaster";
import useLogin from "@/Hooks/useLogin";
import { LongFormText } from "@/Components/Event/LongFormText";
import NavSidebar from "@/Pages/Layout/NavSidebar";
import ErrorBoundary from "@/Components/ErrorBoundary";
import { getCurrentSubscription } from "@/Utils/Subscription";
import { mapPlanName } from "./subscribe";
import { SpotlightThreadModal } from "@/Components/Spotlight/SpotlightThreadModal";

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
  const login = useLogin(s => ({ publicKey: s.publicKey, subscriptions: s.subscriptions }));
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

  if (!login.publicKey) return null;
  const showDeck = CONFIG.showDeck || !(CONFIG.deckSubKind !== undefined && (sub?.type ?? -1) < CONFIG.deckSubKind);
  if (!showDeck) {
    return (
      <div className="deck-layout">
        <NavSidebar narrow={true} />
        <div>
          <div className="flex flex-col gap-2 m-2 bg-dark p br">
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
                  <FormattedMessage defaultMessage="Subscribe" id="gczcC5" />
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
                  <LongFormText ev={deckState.article} isPreview={false} related={[]} />
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

function NotesCol() {
  return (
    <div>
      <div className="deck-col-header flex">
        <div className="flex flex-1 g8">
          <Icon name="rows-01" size={24} />
          <FormattedMessage defaultMessage="Notes" id="7+Domh" />
        </div>
        <div className="flex-1">
          <RootTabs base="/deck" />
        </div>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}

function ArticlesCol() {
  return (
    <div>
      <div className="deck-col-header flex g8">
        <Icon name="file-06" size={24} />
        <FormattedMessage defaultMessage="Articles" id="3KNMbJ" />
      </div>
      <div>
        <Articles />
      </div>
    </div>
  );
}

function MediaCol({ setThread }: { setThread: (e: NostrLink) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 p-2 border-b border-border-color">
        <Icon name="camera-lens" size={24} />
        <FormattedMessage defaultMessage="Media" id="hmZ3Bz" />
      </div>
      <TimelineFollows
        postsOnly={true}
        liveStreams={false}
        noteFilter={e => {
          const parsed = transformTextCached(e.id, e.content, e.tags);
          const images = parsed.filter(a => a.type === "media" && a.mimeType?.startsWith("image/"));
          return images.length > 0;
        }}
        displayAs="grid"
        showDisplayAsSelector={false}
        noteOnClick={e => setThread(NostrLink.fromEvent(e))}
      />
    </div>
  );
}

function NotificationsCol({ setThread }: { setThread: (e: NostrLink) => void }) {
  return (
    <div>
      <div className="deck-col-header flex g8">
        <Icon name="bell-solid" size={24} />
        <FormattedMessage defaultMessage="Notifications" id="NAidKb" />
      </div>
      <div>
        <NotificationsPage onClick={setThread} />
      </div>
    </div>
  );
}
