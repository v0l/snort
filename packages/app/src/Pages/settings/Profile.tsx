import "./Profile.css";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { mapEventToProfile } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

import { System } from "index";
import useEventPublisher from "Feed/EventPublisher";
import { openFile } from "SnortUtils";
import useFileUpload from "Upload";
import AsyncButton from "Element/AsyncButton";
import { UserCache } from "Cache";
import useLogin from "Hooks/useLogin";
import Icon from "Icons/Icon";
import Avatar from "Element/Avatar";

export interface ProfileSettingsProps {
  avatar?: boolean;
  banner?: boolean;
}

export default function ProfileSettings(props: ProfileSettingsProps) {
  const navigate = useNavigate();
  const { publicKey: id } = useLogin();
  const user = useUserProfile(id ?? "");
  const publisher = useEventPublisher();
  const uploader = useFileUpload();

  const [name, setName] = useState<string>();
  const [picture, setPicture] = useState<string>();
  const [banner, setBanner] = useState<string>();
  const [about, setAbout] = useState<string>();
  const [website, setWebsite] = useState<string>();
  const [nip05, setNip05] = useState<string>();
  const [lud16, setLud16] = useState<string>();

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
      System.BroadcastEvent(ev);

      const newProfile = mapEventToProfile(ev);
      if (newProfile) {
        await UserCache.update(newProfile);
      }
    }
  }

  async function uploadFile() {
    const file = await openFile();
    if (file) {
      console.log(file);
      const rsp = await uploader.upload(file, file.name);
      console.log(rsp);
      if (typeof rsp?.error === "string") {
        throw new Error(`Upload failed ${rsp.error}`);
      }
      return rsp.url;
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

  function editor() {
    return (
      <div className="flex f-col g24">
        <div className="flex f-col w-max g8">
          <h4>
            <FormattedMessage defaultMessage="Name" />
          </h4>
          <input className="w-max" type="text" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="flex f-col w-max g8">
          <h4>
            <FormattedMessage defaultMessage="About" />
          </h4>
          <textarea className="w-max" onChange={e => setAbout(e.target.value)} value={about}></textarea>
        </div>
        <div className="flex f-col w-max g8">
          <h4>
            <FormattedMessage defaultMessage="Website" />
          </h4>
          <input className="w-max" type="text" value={website} onChange={e => setWebsite(e.target.value)} />
        </div>
        <div className="flex f-col w-max g8">
          <h4>
            <FormattedMessage defaultMessage="Nostr Address" />
          </h4>
          <div className="flex f-col g8 w-max">
            <input type="text" className="w-max" value={nip05} onChange={e => setNip05(e.target.value)} />
            <small>
              <FormattedMessage defaultMessage="Usernames are not unique on Nostr. The nostr address is your unique human-readable address that is unique to you upon registration." />
            </small>
            <div className="flex g12">
              <button className="flex f-center" type="button" onClick={() => navigate("/nostr-address")}>
                <FormattedMessage defaultMessage="Buy nostr address" />
              </button>
              <button className="flex f-center secondary" type="button" onClick={() => navigate("/nostr-address")}>
                <FormattedMessage defaultMessage="Get a free one" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex f-col w-max g8">
          <h4>
            <FormattedMessage defaultMessage="Lightning Address" />
          </h4>
          <input className="w-max" type="text" value={lud16} onChange={e => setLud16(e.target.value)} />
        </div>
        <AsyncButton onClick={() => saveProfile()}>
          <FormattedMessage defaultMessage="Save" />
        </AsyncButton>
      </div>
    );
  }

  function settings() {
    if (!id) return null;
    return (
      <>
        <div className="flex f-center image-settings">
          {(props.banner ?? true) && (
            <div
              style={{
                backgroundImage: (banner?.length ?? 0) > 0 ? `url(${banner})` : undefined,
              }}
              className="banner">
              <AsyncButton type="button" onClick={() => setNewBanner()}>
                <FormattedMessage defaultMessage="Upload" />
              </AsyncButton>
            </div>
          )}
          {(props.avatar ?? true) && (
            <div className="avatar-stack">
              <Avatar pubkey={id} user={user} image={picture} />
              <AsyncButton type="button" className="btn-rnd" onClick={() => setNewAvatar()}>
                <Icon name="upload-01" />
              </AsyncButton>
            </div>
          )}
        </div>
        {editor()}
      </>
    );
  }

  return <div className="settings">{settings()}</div>;
}
