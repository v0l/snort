import "./Deck.css";
import { createContext, useContext, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { NostrLink, TaggedNostrEvent } from "@snort/system";

import useLoginFeed from "@/Feed/LoginFeed";
import { useLoginRelays } from "@/Hooks/useLoginRelays";
import { useTheme } from "@/Hooks/useTheme";
import Articles from "@/Element/Feed/Articles";
import TimelineFollows from "@/Element/Feed/TimelineFollows";
import { transformTextCached } from "@/Hooks/useTextTransformCache";
import Icon from "@/Icons/Icon";
import NotificationsPage from "./Notifications/Notifications";
import Modal from "@/Element/Modal";
import { Thread } from "@/Element/Event/Thread";
import { RootTabs } from "@/Element/Feed/RootTabs";
import { SpotlightMedia } from "@/Element/SpotlightMedia";
import { ThreadContext, ThreadContextWrapper } from "@/Hooks/useThreadContext";
import Toaster from "@/Toaster";
import useLogin from "@/Hooks/useLogin";
import { LongFormText } from "@/Element/Event/LongFormText";
import NavSidebar from "@/Pages/Layout/NavSidebar";
import ErrorBoundary from "@/Element/ErrorBoundary";

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
  const login = useLogin();
  const navigate = useNavigate();
  const [deckState, setDeckState] = useState<DeckState>({
    thread: undefined,
    article: undefined,
  });

  useLoginFeed();
  useTheme();
  useLoginRelays();

  useEffect(() => {
    if (!login.publicKey) {
      navigate("/");
    }
  }, [login]);

  if (!login.publicKey) return null;
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
            <>
              <Modal id="thread-overlay" onClose={() => setDeckState({})} className="thread-overlay thread">
                <ThreadContextWrapper link={deckState.thread}>
                  <SpotlightFromThread onClose={() => setDeckState({})} />
                  <div>
                    <Thread onBack={() => setDeckState({})} disableSpotlight={true} />
                  </div>
                </ThreadContextWrapper>
              </Modal>
            </>
          )}
          {deckState.article && (
            <>
              <Modal
                id="thread-overlay-article"
                onClose={() => setDeckState({})}
                className="thread-overlay long-form"
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

function SpotlightFromThread({ onClose }: { onClose: () => void }) {
  const thread = useContext(ThreadContext);

  const parsed = thread.root ? transformTextCached(thread.root.id, thread.root.content, thread.root.tags) : [];
  const images = parsed.filter(a => a.type === "media" && a.mimeType?.startsWith("image/"));
  if (images.length === 0) return;
  return <SpotlightMedia images={images.map(a => a.content)} idx={0} onClose={onClose} />;
}

function NotesCol() {
  return (
    <div>
      <div className="deck-col-header flex">
        <div className="flex f-1 g8">
          <Icon name="rows-01" size={24} />
          <FormattedMessage defaultMessage="Notes" id="7+Domh" />
        </div>
        <div className="f-1">
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
        <Icon name="bell-02" size={24} />
        <FormattedMessage defaultMessage="Notifications" id="NAidKb" />
      </div>
      <div>
        <NotificationsPage onClick={setThread} />
      </div>
    </div>
  );
}
