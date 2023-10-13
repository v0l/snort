import { mapEventToProfile } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import AccountName from "./AccountName";
import useLogin from "../../Hooks/useLogin";
import { UserCache } from "../../Cache";
import useEventPublisher from "../../Hooks/useEventPublisher";
import FormattedMessage from "Element/FormattedMessage";

export default function ActiveAccount({ name = "", setAsPrimary = () => {} }) {
  const { publicKey, readonly } = useLogin(s => ({
    publicKey: s.publicKey,
    readonly: s.readonly,
  }));
  const profile = useUserProfile(publicKey);
  const { publisher, system } = useEventPublisher();

  async function saveProfile(nip05: string) {
    if (readonly) {
      return;
    }
    // copy user object and delete internal fields
    const userCopy = {
      ...(profile || {}),
      nip05,
    } as Record<string, string | number | undefined | boolean>;
    delete userCopy["loaded"];
    delete userCopy["created"];
    delete userCopy["pubkey"];
    delete userCopy["npub"];
    delete userCopy["deleted"];
    delete userCopy["zapService"];
    delete userCopy["isNostrAddressValid"];
    console.debug(userCopy);

    if (publisher) {
      const ev = await publisher.metadata(userCopy);
      system.BroadcastEvent(ev);

      const newProfile = mapEventToProfile(ev);
      if (newProfile) {
        await UserCache.update(newProfile);
      }
    }
  }

  const onClick = () => {
    const newNip = name + "@iris.to";
    const timeout = setTimeout(() => {
      saveProfile(newNip);
    }, 2000);
    if (profile) {
      clearTimeout(timeout);
      if (profile.nip05 !== newNip) {
        saveProfile(newNip);
        setAsPrimary();
      }
    }
  };

  return (
    <div>
      <div className="negative">
        <FormattedMessage defaultMessage="You have an active iris.to account" />:
        <AccountName name={name} />
      </div>
      <p>
        <button type="button" onClick={onClick}>
          <FormattedMessage defaultMessage="Set as primary Nostr address (nip05)" />
        </button>
      </p>
    </div>
  );
}
