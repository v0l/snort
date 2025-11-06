import { EventExt, EventKind, TaggedNostrEvent } from "@snort/system";
import classNames from "classnames";

import { NotePropsOptions, NoteProps } from "@/Components/Event/EventComponent";
import Poll from "@/Components/Event/Poll";
import NoteHeader from "@/Components/Event/Note/NoteHeader";
import { NoteText } from "@/Components/Event/Note/NoteText";
import { TranslationInfo } from "@/Components/Event/Note/TranslationInfo";
import NoteFooter from "@/Components/Event/Note/NoteFooter/NoteFooter";
import { useNoteContext } from "@/Components/Event/Note/NoteContext";

interface NoteContentProps {
  props: NoteProps;
  options: NotePropsOptions;
  goToEvent: (e: React.MouseEvent, eTarget: TaggedNostrEvent) => void;
  setSeenAtRef: (node?: Element | null) => void;
  waitUntilInView?: boolean;
  inView: boolean;
}

export function NoteContent({ props, options, goToEvent, setSeenAtRef, waitUntilInView, inView }: NoteContentProps) {
  const { ev, translated, showTranslation } = useNoteContext();

  if (waitUntilInView && !inView) return null;

  return (
    <>
      {options.showHeader && <NoteHeader ev={ev} options={options} />}
      <div onClick={e => goToEvent(e, ev)} className={classNames("min-h-0", props.inset)} ref={setSeenAtRef}>
        <NoteText {...props} translated={translated} showTranslation={showTranslation} />
        {translated && <TranslationInfo />}
        {ev.kind === EventKind.Polls && <Poll ev={ev} zaps={[]} />}
        {options.showFooter && (
          <div className="mt-4">
            <NoteFooter replyCount={props.threadChains?.get(EventExt.keyOf(ev))?.length} />
          </div>
        )}
      </div>
    </>
  );
}
