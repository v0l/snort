import "./Profile.css";
import Nostrich from "nostrich.webp";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShop } from "@fortawesome/free-solid-svg-icons";
import { TaggedRawEvent } from "@snort/nostr";

import useEventPublisher from "Feed/EventPublisher";
import { useUserProfile } from "Hooks/useUserProfile";
import { hexToBech32, openFile } from "Util";
import Copy from "Element/Copy";
import useFileUpload from "Upload";
import AsyncButton from "Element/AsyncButton";
import { mapEventToProfile, UserCache } from "Cache";
import useLogin from "Hooks/useLogin";

import messages from "./messages";

export interface ProfileSettingsProps {
  avatar?: boolean;
  banner?: boolean;
  privateKey?: boolean;
}

export default function ProfileSettings(props: ProfileSettingsProps) {
  const navigate = useNavigate();
  const { publicKey: id, privateKey: privKey } = useLogin();
  const user = useUserProfile(id ?? "");
  const publisher = useEventPublisher();
  const uploader = useFileUpload();

  const [name, setName] = useState<string>();
  const [displayName, setDisplayName] = useState<string>();
  const [picture, setPicture] = useState<string>();
  const [banner, setBanner] = useState<string>();
  const [about, setAbout] = useState<string>();
  const [website, setWebsite] = useState<string>();
  const [nip05, setNip05] = useState<string>();
  const [lud16, setLud16] = useState<string>();

  const avatarPicture = (picture?.length ?? 0) === 0 ? Nostrich : picture;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setDisplayName(user.display_name);
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
      display_name: displayName,
      about,
      picture,
      banner,
      website,
      nip05,
      lud16,
    } as Record<string, string | number | undefined>;
    delete userCopy["loaded"];
    delete userCopy["created"];
    delete userCopy["pubkey"];
    delete userCopy["npub"];
    delete userCopy["deleted"];
    delete userCopy["zapService"];
    console.debug(userCopy);

    const ev = await publisher.metadata(userCopy);
    console.debug(ev);
    publisher.broadcast(ev);

    const newProfile = mapEventToProfile(ev as TaggedRawEvent);
    if (newProfile) {
      await UserCache.set(newProfile);
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

  async function setNewAvatar() {
    const rsp = await uploadFile();
    if (rsp) {
      setPicture(rsp);
    }
  }

  async function setNewBanner() {
    const rsp = await uploadFile();
    if (rsp) {
      setBanner(rsp);
    }
  }

  function editor() {
    return (
      <div className="editor form">
        <div className="form-group card">
          <div>
            <FormattedMessage {...messages.Name} />:
          </div>
          <div>
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>
        <div className="form-group card">
          <div>
            <FormattedMessage {...messages.DisplayName} />:
          </div>
          <div>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
        </div>
        <div className="form-group card">
          <div>
            <FormattedMessage {...messages.About} />:
          </div>
          <div className="w-max">
            <textarea className="w-max" onChange={e => setAbout(e.target.value)} value={about}></textarea>
          </div>
        </div>
        <div className="form-group card">
          <div>
            <FormattedMessage {...messages.Website} />:
          </div>
          <div>
            <input type="text" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>
        </div>
        <div className="form-group card">
          <div>
            <FormattedMessage {...messages.Nip05} />:
          </div>
          <div>
            <input type="text" className="mr10" value={nip05} onChange={e => setNip05(e.target.value)} />
            {nip05 === "" && (
              <button type="button" onClick={() => navigate("/verification")}>
                <FontAwesomeIcon icon={faShop} />
                &nbsp; <FormattedMessage {...messages.Buy} />
              </button>
            )}
          </div>
        </div>
        <div className="form-group card">
          <div>
            <FormattedMessage {...messages.LnAddress} />:
          </div>
          <div>
            <input type="text" value={lud16} onChange={e => setLud16(e.target.value)} />
          </div>
        </div>
        <div className="form-group card">
          <div></div>
          <div>
            <AsyncButton onClick={() => saveProfile()}>
              <FormattedMessage {...messages.Save} />
            </AsyncButton>
          </div>
        </div>
      </div>
    );
  }

  function settings() {
    if (!id) return null;
    return (
      <>
        <div className="flex f-center image-settings">
          {(props.avatar ?? true) && (
            <div className="image-setting card">
              <div>
                <FormattedMessage {...messages.Avatar} />:
              </div>
              <div style={{ backgroundImage: `url(${avatarPicture})` }} className="avatar">
                <div className="edit" onClick={() => setNewAvatar()}>
                  <FormattedMessage {...messages.Edit} />
                </div>
              </div>
            </div>
          )}
          {(props.banner ?? true) && (
            <div className="image-setting card">
              <div>
                <FormattedMessage {...messages.Banner} />:
              </div>
              <div
                style={{
                  backgroundImage: `url(${(banner?.length ?? 0) === 0 ? Nostrich : banner})`,
                }}
                className="banner">
                <div className="edit" onClick={() => setNewBanner()}>
                  <FormattedMessage {...messages.Edit} />
                </div>
              </div>
            </div>
          )}
        </div>
        {editor()}
      </>
    );
  }

  return (
    <div className="settings">
      <h3>
        <FormattedMessage {...messages.EditProfile} />
      </h3>
      {settings()}
      {privKey && (props.privateKey ?? true) && (
        <div className="flex f-col bg-grey">
          <div>
            <h4>
              <FormattedMessage {...messages.PrivateKey} />:
            </h4>
          </div>
          <div>
            <Copy text={hexToBech32("nsec", privKey)} />
          </div>
        </div>
      )}
    </div>
  );
}
