import { NostrLink, TaggedNostrEvent } from "@snort/system";

import { ThreadElement } from "@/Components/Event/Thread/Thread";
import Modal from "@/Components/Modal/Modal";
import { SpotlightMedia } from "@/Components/Spotlight/SpotlightMedia";
import getEventMedia from "@/Utils/getEventMedia";
import { ThreadContextWrapper } from "@/Utils/Thread/ThreadContextWrapper";

interface SpotlightThreadModalProps {
  thread?: NostrLink;
  event?: TaggedNostrEvent;
  className?: string;
  onClose?: () => void;
  onBack?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function SpotlightThreadModal(props: SpotlightThreadModalProps) {
  const onClose = () => props.onClose?.();
  const onBack = () => props.onBack?.();
  const onClickBg = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!props.thread && !props.event) {
    throw new Error("SpotlightThreadModal requires either thread or event");
  }

  const link = props.event ? NostrLink.fromEvent(props.event) : props.thread;
  return (
    <Modal id="spotlight-media-modal" className={props.className} onClose={onClose} bodyClassName={"flex flex-1"}>
      <ThreadContextWrapper link={link!}>
        <div className="flex flex-row h-screen w-screen">
          <div className="flex w-full md:w-2/3 items-center justify-center overflow-hidden" onClick={onClickBg}>
            <SpotlightFromEvent
              event={props.event || props.thread}
              onClose={onClose}
              onNext={props.onNext}
              onPrev={props.onPrev}
            />
          </div>
          <div className="bg-layer-1 md:flex w-1/3 min-w-[400px] overflow-y-auto">
            <ThreadElement onBack={onBack} disableSpotlight={true} />
          </div>
        </div>
      </ThreadContextWrapper>
    </Modal>
  );
}

interface SpotlightFromEventProps {
  event: TaggedNostrEvent;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

function SpotlightFromEvent({ event, onClose, onNext, onPrev }: SpotlightFromEventProps) {
  const media = getEventMedia(event);
  return (
    <SpotlightMedia
      className="w-full"
      media={media.map(a => a.content)}
      idx={0}
      onClose={onClose}
      onNext={onNext}
      onPrev={onPrev}
    />
  );
}
