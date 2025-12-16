import { FormattedMessage } from "react-intl";
import type { EventKind } from "@snort/system";

import Modal from "@/Components/Modal/Modal";
import useAppHandler from "@/Hooks/useAppHandler";
import Avatar from "@/Components/User/Avatar";
import DisplayName from "@/Components/User/DisplayName";
import Icon from "@/Components/Icons/Icon";

interface DvmSelectorProps {
  kind: number;
  onClose: () => void;
  onSelect: (pubkey: string) => void;
  currentProvider?: string;
}

export default function DvmSelector({ kind, onClose, onSelect, currentProvider }: DvmSelectorProps) {
  const apps = useAppHandler(kind as EventKind);

  const handleSelect = (providerPubkey: string) => {
    onSelect(providerPubkey);
    onClose();
  };

  return (
    <Modal id="dvm-selector" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            <FormattedMessage defaultMessage="Select Provider" />
          </h2>
        </div>

        <div className="text-sm text-neutral-400">
          <FormattedMessage defaultMessage="Choose a DVM (Data Vending Machine) to provide content." />
        </div>

        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {apps.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <FormattedMessage defaultMessage="No DVM providers found" />
            </div>
          ) : (
            apps
              .sort((a, _) => (currentProvider === a.event.pubkey ? -1 : 0))
              .map(app => {
                const isSelected = currentProvider === app.event.pubkey;

                return (
                  <div
                    key={app.event.id}
                    onClick={() => handleSelect(app.event.pubkey)}
                    className={`flex items-start gap-3 layer-1-hover mr-1`}>
                    <Avatar pubkey={app.event.pubkey} user={app.metadata} size={48} />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <DisplayName pubkey={app.event.pubkey} user={app.metadata} />
                        {isSelected && <Icon name="check" size={16} className="text-highlight" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-400 mt-1">
                        {app.reccomendations.length > 0 && (
                          <>
                            <Icon name="thumbs-up" size={14} />
                            {app.reccomendations.length}{" "}
                            {app.reccomendations.length === 1 ? "recommendation" : "recommendations"}
                          </>
                        )}
                      </div>
                      {app.metadata?.about && <div className="text-sm text-neutral-400 mt-1">{app.metadata.about}</div>}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </Modal>
  );
}
