import Modal from "@/Element/Modal";
import { ThreadContext, ThreadContextWrapper } from "@/Hooks/useThreadContext";
import { Thread } from "@/Element/Event/Thread";
import { useContext } from "react";
import { transformTextCached } from "@/Hooks/useTextTransformCache";
import { SpotlightMedia } from "@/Element/Spotlight/SpotlightMedia";
import { NostrLink } from "@snort/system";

export function SpotlightThreadModal(props: { thread: NostrLink; onClose?: () => void; onBack?: () => void }) {
  const onClose = () => props.onClose?.();
  const onBack = () => props.onBack?.();

  return (
    <Modal id="thread-overlay" onClose={onClose} bodyClassName={"flex flex-1"}>
      <ThreadContextWrapper link={props.thread}>
        <div className="flex flex-row h-screen w-screen">
          <div className="flex w-full md:w-2/3 items-center justify-center overflow-hidden">
            <SpotlightFromThread onClose={onClose} />
          </div>
          <div className="hidden md:flex w-1/3 min-w-[400px] flex-shrink-0 overflow-y-auto bg-bg-color">
            <Thread onBack={onBack} disableSpotlight={true} />
          </div>
        </div>
      </ThreadContextWrapper>
    </Modal>
  );
}

function SpotlightFromThread({ onClose }: { onClose: () => void }) {
  const thread = useContext(ThreadContext);

  const parsed = thread.root ? transformTextCached(thread.root.id, thread.root.content, thread.root.tags) : [];
  const images = parsed.filter(
    a => a.type === "media" && (a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/")),
  );
  if (images.length === 0) return;
  return <SpotlightMedia images={images.map(a => a.content)} idx={0} onClose={onClose} />;
}
