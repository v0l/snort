import "./Thread.css";

import { EventExt, TaggedNostrEvent, u256 } from "@snort/system";
import { ReactNode, useCallback, useContext, useMemo } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import BackButton from "@/Components/Button/BackButton";
import Note from "@/Components/Event/EventComponent";
import NoteGhost from "@/Components/Event/Note/NoteGhost";
import { Subthread } from "@/Components/Event/Thread/Subthread";
import { chainKey } from "@/Utils/Thread/ChainKey";
import { ThreadContext } from "@/Utils/Thread/ThreadContext";

export function Thread(props: { onBack?: () => void; disableSpotlight?: boolean }) {
  const thread = useContext(ThreadContext);

  const navigate = useNavigate();
  const isSingleNote = thread.chains?.size === 1 && [thread.chains.values].every(v => v.length === 0);
  const { formatMessage } = useIntl();

  const rootOptions = useMemo(
    () => ({ showReactionsLink: true, showMediaSpotlight: !props.disableSpotlight, isRoot: true }),
    [props.disableSpotlight],
  );

  const navigateThread = useCallback(
    (e: TaggedNostrEvent) => {
      thread.setCurrent(e.id);
      // navigate(`/${NostrLink.fromEvent(e).encode()}`, { replace: true });
    },
    [thread],
  );

  const parent = useMemo(() => {
    if (thread.root) {
      const currentThread = EventExt.extractThread(thread.root);
      return (
        currentThread?.replyTo?.value ??
        currentThread?.root?.value ??
        (currentThread?.root?.key === "a" && currentThread.root?.value)
      );
    }
  }, [thread.root]);

  function renderRoot(note: TaggedNostrEvent) {
    const className = `thread-root${isSingleNote ? " thread-root-single" : ""}`;
    if (note) {
      return (
        <Note
          className={className}
          key={note.id}
          data={note}
          options={rootOptions}
          onClick={navigateThread}
          threadChains={thread.chains}
          waitUntilInView={false}
        />
      );
    } else {
      return <NoteGhost className={className}>Loading thread root.. ({thread.data?.length} notes loaded)</NoteGhost>;
    }
  }

  function renderChain(from: u256): ReactNode {
    if (!from || thread.chains.size === 0) {
      return;
    }
    const replies = thread.chains.get(from);
    if (replies && thread.current) {
      return <Subthread active={thread.current} notes={replies} chains={thread.chains} onNavigate={navigateThread} />;
    }
  }

  function goBack() {
    if (parent) {
      thread.setCurrent(parent);
    } else if (props.onBack) {
      props.onBack();
    } else {
      navigate(-1);
    }
  }

  const parentText = formatMessage({
    defaultMessage: "Parent",
    id: "ADmfQT",
    description: "Link to parent note in thread",
  });

  const debug = window.location.search.includes("debug=true");
  return (
    <>
      {debug && (
        <div className="main-content p xs">
          <h1>Chains</h1>
          <pre>
            {JSON.stringify(
              Object.fromEntries([...thread.chains.entries()].map(([k, v]) => [k, v.map(c => c.id)])),
              undefined,
              "  ",
            )}
          </pre>
          <h1>Current</h1>
          <pre>{JSON.stringify(thread.current)}</pre>
          <h1>Root</h1>
          <pre>{JSON.stringify(thread.root, undefined, "  ")}</pre>
          <h1>Data</h1>
          <pre>{JSON.stringify(thread.data, undefined, "  ")}</pre>
          <h1>Reactions</h1>
          <pre>{JSON.stringify(thread.reactions, undefined, "  ")}</pre>
        </div>
      )}
      {parent && (
        <div className="main-content p">
          <BackButton onClick={goBack} text={parentText} />
        </div>
      )}
      <div className="main-content">
        {thread.root && renderRoot(thread.root)}
        {thread.root && renderChain(chainKey(thread.root))}
      </div>
    </>
  );
}
