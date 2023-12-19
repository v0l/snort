import Modal from "@/Element/Modal";
import { ThreadContext, ThreadContextWrapper } from "@/Hooks/useThreadContext";
import { Thread } from "@/Element/Event/Thread";
import { useContext } from "react";
import { SpotlightMedia } from "@/Element/Spotlight/SpotlightMedia";
import { NostrLink } from "@snort/system";
import getEventMedia from "@/Element/Event/getEventMedia";

interface SpotlightThreadModalProps {
  thread: NostrLink;
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

  return (
    <Modal className={props.className} onClose={onClose} bodyClassName={"flex flex-1"}>
      <ThreadContextWrapper link={props.thread}>
        <div className="flex flex-row h-screen w-screen">
          <div className="flex w-full md:w-2/3 items-center justify-center overflow-hidden" onClick={onClickBg}>
            <SpotlightFromThread onClose={onClose} onNext={props.onNext} onPrev={props.onPrev} />
          </div>
          <div className="hidden md:flex w-1/3 min-w-[400px] flex-shrink-0 overflow-y-auto bg-bg-color">
            <Thread onBack={onBack} disableSpotlight={true} />
          </div>
        </div>
      </ThreadContextWrapper>
    </Modal>
  );
}

interface SpotlightFromThreadProps {
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

function SpotlightFromThread({ onClose, onNext, onPrev }: SpotlightFromThreadProps) {
  const thread = useContext(ThreadContext);

  if (!thread?.root) return null;
  const media = getEventMedia(thread.root);
  if (media.length === 0) return;
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
