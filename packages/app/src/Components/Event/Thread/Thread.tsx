import { EventExt, TaggedNostrEvent } from "@snort/system";
import { ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import BackButton from "@/Components/Button/BackButton";
import Note from "@/Components/Event/EventComponent";
import { ThreadContext, ThreadContextState } from "@/Utils/Thread";
import Modal from "@/Components/Modal/Modal";
import JsonBlock from "@/Components/json";
import Icon from "@/Components/Icons/Icon";
import { getReplies } from "./util";
import { Subthread } from "./Subthread";
import { WarningNotice } from "@/Components/WarningNotice/WarningNotice";

interface ThreadProps {
  onBack?: () => void;
  disableSpotlight?: boolean;
}

export function ThreadElement(props: ThreadProps) {
  const thread = useContext(ThreadContext);

  if (!thread) {
    return (
      <WarningNotice>
        <FormattedMessage defaultMessage="Not a thread!" />
      </WarningNotice>
    );
  }

  return <ThreadInner {...props} thread={thread} />;
}

function ThreadInner({ thread, ...props }: ThreadProps & { thread: ThreadContextState }) {
  const navigate = useNavigate();

  const rootOptions = useMemo(
    () => ({ showReactionsLink: true, showMediaSpotlight: !props.disableSpotlight, isRoot: true }),
    [props.disableSpotlight],
  );

  const navigateThread = useCallback(
    (e: TaggedNostrEvent) => {
      thread?.setCurrent(EventExt.keyOf(e));
      // navigate(`/${NostrLink.fromEvent(e).encode()}`, { replace: true });
    },
    [thread],
  );

  function renderChain(from: string): ReactNode {
    if (!from || thread.chains.size === 0) {
      return;
    }
    const replies = getReplies(from, thread.data, thread.chains);
    if (replies.length > 0) {
      return (
        <Subthread
          active={thread.current}
          notes={replies}
          allNotes={thread.data}
          onNavigate={navigateThread}
          chains={thread.chains}
        />
      );
    }
  }

  function renderCurrent() {
    if (thread.current) {
      const note = thread.data.find(n => EventExt.keyOf(n) === thread.current);
      if (note) {
        return (
          <Note
            data={note}
            options={{ showReactionsLink: true, showMediaSpotlight: true }}
            threadChains={thread.chains}
            onClick={navigateThread}
            className="text-lg"
          />
        );
      } else {
        return (
          <div className="px-3 py-2 break-all">
            <FormattedMessage
              defaultMessage="Loading note: {id}"
              values={{
                id: <code className="font-mono bg-layer-1 px-1.5 py-0.5 rounded-lg">{thread.current}</code>,
              }}
            />
          </div>
        );
      }
    }
  }

  function goBack() {
    if (thread.parent) {
      thread.setCurrent(EventExt.keyOf(thread.parent));
    } else if (props.onBack) {
      props.onBack();
    } else {
      navigate(-1);
    }
  }

  return (
    <>
      {thread.parent && (
        <div className="px-3 py-2">
          <BackButton
            onClick={goBack}
            text={<FormattedMessage defaultMessage="Parent" description="Link to parent note in thread" />}
          />
        </div>
      )}
      <div>
        {thread.root && (
          <>
            <Note
              className={"text-lg"}
              key={EventExt.keyOf(thread.root)}
              data={thread.root}
              options={rootOptions}
              onClick={navigateThread}
              threadChains={thread.chains}
              waitUntilInView={false}
            />
            {renderChain(EventExt.keyOf(thread.root))}
          </>
        )}
        {!thread.root && renderCurrent()}
        {thread.mutedData.length > 0 && (
          <div className="layer-1 mx-2 my-3 font-medium cursor-pointer">
            <FormattedMessage
              defaultMessage="{n} notes have been muted"
              values={{
                n: thread.mutedData.length,
              }}
            />
          </div>
        )}
        <ThreadDebug />
      </div>
    </>
  );
}

function ThreadDebug() {
  const thread = useContext(ThreadContext);
  const [show, setShow] = useState(false);

  if (!thread) return;
  if (!show)
    return (
      <div
        onClick={() => setShow(true)}
        className="flex items-center justify-center gap-2 text-neutral-500 cursor-pointer select-none leading-12 border">
        <Icon name="json" size={16} />
        <FormattedMessage defaultMessage="Show Thread Data" />
      </div>
    );
  return (
    <Modal id="thread-dump" onClose={() => setShow(false)}>
      <JsonBlock
        obj={{
          ...thread,
          chains: Object.fromEntries(thread.chains.entries().map(([k, v]) => [k, v])),
        }}
      />
    </Modal>
  );
}
