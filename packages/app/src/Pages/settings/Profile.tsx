import { fetchNip05Pubkey, LNURL } from "@snort/shared";
import { mapEventToProfile } from "@snort/system";
import { useUserProfile } from "@snort/system-react";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import { ErrorOrOffline } from "@/Components/ErrorOrOffline";
import messages from "@/Components/messages";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { debounce, openFile } from "@/Utils";
import { MaxAboutLength, MaxUsernameLength } from "@/Utils/Const";
import useFileUpload from "@/Utils/Upload";
import AvatarEditor from "@/Components/User/AvatarEditor";

export interface ProfileSettingsProps {
  avatar?: boolean;
  banner?: boolean;
}

export default function ProfileSettings(props: ProfileSettingsProps) {
  const { formatMessage } = useIntl();
  const { id, publicKey, readonly } = useLogin(s => ({ id: s.id, publicKey: s.publicKey, readonly: s.readonly }));
  const user = useUserProfile(publicKey ?? "");
  const { publisher, system } = useEventPublisher();
  const uploader = useFileUpload();
  const [error, setError] = useState<Error>();

  const [name, setName] = useState<string>();
  const [picture, setPicture] = useState<string>();
  const [banner, setBanner] = useState<string>();
  const [about, setAbout] = useState<string>();
  const [website, setWebsite] = useState<string>();
  const [nip05, setNip05] = useState<string>();
  const [lud16, setLud16] = useState<string>();
  const [nip05AddressValid, setNip05AddressValid] = useState<boolean>();
  const [invalidNip05AddressMessage, setInvalidNip05AddressMessage] = useState<string>();
  const [usernameValid, setUsernameValid] = useState<boolean>();
  const [invalidUsernameMessage, setInvalidUsernameMessage] = useState<string>();
  const [aboutValid, setAboutValid] = useState<boolean>();
  const [invalidAboutMessage, setInvalidAboutMessage] = useState<string>();
  const [lud16Valid, setLud16Valid] = useState<boolean>();
  const [invalidLud16Message, setInvalidLud16Message] = useState<string>();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPicture(user.picture);
      setBanner(user.banner);
      setAbout(user.about);
      setWebsite(user.website);
      setNip05(user.nip05);
      setLud16(user.lud16);
    }
  }, [user]);

  useEffect(() => {
    return debounce(500, async () => {
      if (lud16) {
        try {
          await new LNURL(lud16).load();
          setLud16Valid(true);
          setInvalidLud16Message("");
        } catch (e) {
          setLud16Valid(false);
          setInvalidLud16Message(formatMessage(messages.InvalidLud16));
        }
      } else {
        setInvalidLud16Message("");
      }
    });
  }, [lud16]);

  useEffect(() => {
    return debounce(500, async () => {
      const Nip05AddressElements = nip05?.split("@") ?? [];
      if ((nip05?.length ?? 0) === 0) {
        setNip05AddressValid(false);
        setInvalidNip05AddressMessage("");
      } else if (Nip05AddressElements.length < 2) {
        setNip05AddressValid(false);
        setInvalidNip05AddressMessage(formatMessage(messages.InvalidNip05Address));
      } else if (Nip05AddressElements.length === 2) {
        nip05NostrAddressVerification(Nip05AddressElements.pop(), Nip05AddressElements.pop());
      } else {
        setNip05AddressValid(false);
      }
    });
  }, [nip05]);

  async function saveProfile() {
    // copy user object and delete internal fields
    const userCopy = {
      ...user,
      name,
      about,
      picture,
      banner,
      website,
      nip05,
      lud16,
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
      await system.BroadcastEvent(ev);

      const newProfile = mapEventToProfile(ev);
      if (newProfile) {
        await system.config.profiles.set(newProfile);
      }
    }
  }

  async function uploadFile() {
    try {
      setError(undefined);
      const file = await openFile();
      if (file && uploader) {
        const rsp = await uploader.upload(file);
        if ("error" in rsp && typeof rsp?.error === "string") {
          throw new Error(`Upload failed ${rsp.error}`);
        }
        return rsp.url;
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
    }
  }

  async function setNewBanner() {
    const rsp = await uploadFile();
    if (rsp) {
      setBanner(rsp);
    }
  }

  async function setNewAvatar() {
    const rsp = await uploadFile();
    if (rsp) {
      setPicture(rsp);
    }
  }

  async function onNip05Change(e: React.ChangeEvent<HTMLInputElement>) {
    const Nip05Address = e.target.value.toLowerCase();
    setNip05(Nip05Address);
  }

  async function onLimitCheck(val: string, field: string) {
    if (field === "username") {
      setName(val);
      if (val?.length >= MaxUsernameLength) {
        setUsernameValid(false);
        setInvalidUsernameMessage(
          formatMessage(messages.UserNameLengthError, {
            limit: MaxUsernameLength,
          }),
        );
      } else {
        setUsernameValid(true);
        setInvalidUsernameMessage("");
      }
    } else if (field === "about") {
      setAbout(val);
      if (val?.length >= MaxAboutLength) {
        setAboutValid(false);
        setInvalidAboutMessage(
          formatMessage(messages.AboutLengthError, {
            limit: MaxAboutLength,
          }),
        );
      } else {
        setAboutValid(true);
        setInvalidAboutMessage("");
      }
    }
  }

  async function nip05NostrAddressVerification(nip05Domain: string | undefined, nip05Name: string | undefined) {
    try {
      const result = await fetchNip05Pubkey(nip05Name!, nip05Domain!);
      if (result) {
        if (result === publicKey) {
          setNip05AddressValid(true);
        } else {
          setInvalidNip05AddressMessage(
            formatMessage({ defaultMessage: "Nostr address does not belong to you", id: "01iNut" }),
          );
        }
      } else {
        setNip05AddressValid(false);
        setInvalidNip05AddressMessage(formatMessage(messages.InvalidNip05Address));
      }
    } catch (e) {
      setNip05AddressValid(false);
      setInvalidNip05AddressMessage(formatMessage(messages.InvalidNip05Address));
    }
  }

  async function onLud16Change(address: string) {
    setLud16(address);
  }

  function editor() {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h4>
            <FormattedMessage defaultMessage="Name" />
          </h4>
          <input
            className=""
            type="text"
            value={name}
            onChange={e => onLimitCheck(e.target.value, "username")}
            disabled={readonly}
            maxLength={MaxUsernameLength}
          />
          <div>{usernameValid === false ? <span className="warning">{invalidUsernameMessage}</span> : <></>}</div>
        </div>
        <div className="flex flex-col gap-2">
          <h4>
            <FormattedMessage defaultMessage="About" />
          </h4>
          <textarea
            className=""
            onChange={e => onLimitCheck(e.target.value, "about")}
            value={about}
            disabled={readonly}
            maxLength={MaxAboutLength}></textarea>
          <div>{aboutValid === false ? <span className="warning">{invalidAboutMessage}</span> : <></>}</div>
        </div>
        <div className="flex flex-col gap-2">
          <h4>
            <FormattedMessage defaultMessage="Website" />
          </h4>
          <input
            className=""
            type="text"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            disabled={readonly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h4>
            <FormattedMessage defaultMessage="Nostr Address" />
          </h4>
          <div className="flex flex-col gap-2 ">
            <input type="text" className="" value={nip05} onChange={e => onNip05Change(e)} disabled={readonly} />
            <div>{!nip05AddressValid && <span className="warning">{invalidNip05AddressMessage}</span>}</div>
            <small>
              <FormattedMessage defaultMessage="Usernames are not unique on Nostr. The nostr address is your unique human-readable address that is unique to you upon registration." />
            </small>
            <div className="flex gap-3">
              <Link to="/nostr-address">
                <button>
                  <FormattedMessage defaultMessage="Buy nostr address" />
                </button>
              </Link>
              {/* <Link to="/free-nostr-address">
                <button className="secondary">
                  <FormattedMessage defaultMessage="Get a free one" />
                </button>
              </Link> */}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h4>
            <FormattedMessage defaultMessage="Lightning Address" />
          </h4>
          <input
            className=""
            type="text"
            value={lud16}
            onChange={e => onLud16Change(e.target.value.toLowerCase())}
            disabled={readonly}
          />
          <div>{lud16Valid === false ? <span className="warning">{invalidLud16Message}</span> : <></>}</div>
        </div>
        <AsyncButton className="primary" onClick={() => saveProfile()} disabled={readonly}>
          <FormattedMessage defaultMessage="Save" />
        </AsyncButton>
      </div>
    );
  }

  function settings() {
    if (!publicKey) return null;
    return (
      <>
        <div className="flex flex-col gap-2">
          {(props.banner ?? true) && (
            <div
              style={{
                background: (banner?.length ?? 0) > 0 ? `no-repeat center/cover url("${banner}")` : undefined,
              }}
              className="bg-layer-1 -mx-3 min-h-[140px] flex items-center justify-center">
              <AsyncButton onClick={() => setNewBanner()} disabled={readonly}>
                <FormattedMessage defaultMessage="Upload Banner" />
              </AsyncButton>
            </div>
          )}
          {(props.avatar ?? true) && <AvatarEditor onPictureChange={p => setPicture(p)} picture={picture} />}
        </div>
        {error && <ErrorOrOffline error={error} />}
        {editor()}
      </>
    );
  }

  return <div className="settings">{settings()}</div>;
}
