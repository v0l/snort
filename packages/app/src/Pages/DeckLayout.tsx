import "./Deck.css";
import { CSSProperties, useContext, useState } from "react";
import { Outlet } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { NostrPrefix, createNostrLink } from "@snort/system";

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

export function SnortDeckLayout() {
    const [thread, setThread] = useState<string>();

    useLoginFeed();
    useTheme();
    useLoginRelays();
    const { proxy } = useImgProxy();

    return <div className="deck-layout">
        <DeckNav />
        <div className="deck-cols">
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
            <div>
                <div className="deck-col-header flex g8">
                    <Icon name="file-06" size={24} />
                    <FormattedMessage defaultMessage="Articles" />
                </div>
                <div>
                    <Articles />
                </div>
            </div>
            <div>
                <div className="deck-col-header flex g8">
                    <Icon name="camera-lens" size={24} />
                    <FormattedMessage defaultMessage="Media" />
                </div>
                <div className="image-grid p">
                    <TimelineFollows postsOnly={true} liveStreams={false} noteFilter={e => {
                        const parsed = transformTextCached(e.id, e.content, e.tags);
                        const images = parsed.filter(a => a.type === "media" && a.mimeType?.startsWith("image/"));
                        return images.length > 0;
                    }} noteRenderer={e => {
                        const parsed = transformTextCached(e.id, e.content, e.tags);
                        const images = parsed.filter(a => a.type === "media" && a.mimeType?.startsWith("image/"));

                        return <div className="media-note" key={e.id} style={{
                            "--img": `url(${proxy(images[0].content)})`
                        } as CSSProperties} onClick={() => setThread(e.id)}></div>
                    }} />
                </div>
            </div>
            <div>
                <div className="deck-col-header flex g8">
                    <Icon name="bell-02" size={24} />
                    <FormattedMessage defaultMessage="Notifications" />
                </div>
                <div>
                    <NotificationsPage />
                </div>
            </div>
        </div>
        {thread && <>
            <Modal onClose={() => setThread(undefined)} className="thread-overlay">
                <ThreadContextWrapper link={createNostrLink(NostrPrefix.Note, thread)}>
                    <SpotlightFromThread onClose={() => setThread(undefined)} />
                    <div>
                        <Thread />
                    </div>
                </ThreadContextWrapper>
            </Modal>
        </>}
    </div>
}

function SpotlightFromThread({ onClose }: { onClose: () => void }) {
    const thread = useContext(ThreadContext);

    const parsed = thread.root ? transformTextCached(thread.root.id, thread.root.content, thread.root.tags) : [];
    const images = parsed.filter(a => a.type === "media" && a.mimeType?.startsWith("image/"));

    return <SpotlightMedia images={images.map(a => a.content)} idx={0} onClose={onClose} />
}