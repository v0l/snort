import "./Deck.css";
import { CSSProperties, createContext, useContext, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { NostrLink } from "@snort/system";

import { DeckNav } from "Element/Deck/Nav";
import useLoginFeed from "Feed/LoginFeed";
import { useLoginRelays } from "Hooks/useLoginRelays";
import { useTheme } from "Hooks/useTheme";
import Articles from "Element/Deck/Articles";
import TimelineFollows from "Element/TimelineFollows";
import { transformTextCached } from "Hooks/useTextTransformCache";
import Icon from "Icons/Icon";
import NotificationsPage from "./Notifications";
import useImgProxy from "Hooks/useImgProxy";
import Modal from "Element/Modal";
import { Thread } from "Element/Thread";
import { RootTabs } from "Element/RootTabs";
import { SpotlightMedia } from "Element/SpotlightMedia";
import { ThreadContext, ThreadContextWrapper } from "Hooks/useThreadContext";
import Toaster from "Toaster";
import useLogin from "Hooks/useLogin";

type Cols = "notes" | "articles" | "media" | "streams" | "notifications";

interface DeckScope {
  thread?: NostrLink;
  setThread: (e?: NostrLink) => void;
}

export const DeckContext = createContext<DeckScope | undefined>(undefined);

export function SnortDeckLayout() {
  const login = useLogin();
  const navigate = useNavigate();
  const [deckScope, setDeckScope] = useState<DeckScope>({
    setThread: (e?: NostrLink) => setDeckScope(s => ({ ...s, thread: e })),
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
      <DeckContext.Provider value={deckScope}>
        <DeckNav />
        <div className="deck-cols">
          {cols.map(c => {
            switch (c) {
              case "notes":
                return <NotesCol />;
              case "media":
                return <MediaCol setThread={deckScope.setThread} />;
              case "articles":
                return <ArticlesCol />;
              case "notifications":
                return <NotificationsCol />;
            }
          })}
        </div>
        {deckScope.thread && (
          <>
            <Modal onClose={() => deckScope.setThread(undefined)} className="thread-overlay">
              <ThreadContextWrapper link={deckScope.thread}>
                <SpotlightFromThread onClose={() => deckScope.setThread(undefined)} />
                <div>
                  <Thread onBack={() => deckScope.setThread(undefined)} />
                </div>
              </ThreadContextWrapper>
            </Modal>
          </>
        )}
        <Toaster />
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
          <FormattedMessage defaultMessage="Notes" />
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
        <FormattedMessage defaultMessage="Articles" />
      </div>
      <div>
        <Articles />
      </div>
    </div>
  );
}

function MediaCol({ setThread }: { setThread: (e: NostrLink) => void }) {
  const { proxy } = useImgProxy();
  return (
    <div>
      <div className="deck-col-header flex g8">
        <Icon name="camera-lens" size={24} />
        <FormattedMessage defaultMessage="Media" />
      </div>
      <div className="image-grid p">
        <TimelineFollows
          postsOnly={true}
          liveStreams={false}
          noteFilter={e => {
            const parsed = transformTextCached(e.id, e.content, e.tags);
            const images = parsed.filter(a => a.type === "media" && a.mimeType?.startsWith("image/"));
            return images.length > 0;
          }}
          noteRenderer={e => {
            const parsed = transformTextCached(e.id, e.content, e.tags);
            const images = parsed.filter(a => a.type === "media" && a.mimeType?.startsWith("image/"));

            return (
              <div
                className="media-note"
                key={e.id}
                style={
                  {
                    "--img": `url(${proxy(images[0].content)})`,
                  } as CSSProperties
                }
                onClick={() => setThread(NostrLink.fromEvent(e))}></div>
            );
          }}
        />
      </div>
    </div>
  );
}

function NotificationsCol() {
  return (
    <div>
      <div className="deck-col-header flex g8">
        <Icon name="bell-02" size={24} />
        <FormattedMessage defaultMessage="Notifications" />
      </div>
      <div>
        <NotificationsPage />
      </div>
    </div>
  );
}
