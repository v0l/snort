import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import { Tab } from "@/Components/TabSelectors/TabSelectors";
import { ProfileTabType } from "@/Pages/Profile/ProfileTabType";

const ProfileTabSelectors = {
  Notes: {
    text: (
      <>
        <Icon name="pencil" size={16} />
        <FormattedMessage defaultMessage="Notes" id="7+Domh" />
      </>
    ),
    value: ProfileTabType.NOTES,
  },
  Reactions: {
    text: (
      <>
        <Icon name="heart-solid" size={16} />
        <FormattedMessage defaultMessage="Reactions" id="XgWvGA" />
      </>
    ),
    value: ProfileTabType.REACTIONS,
  },
  Followers: {
    text: (
      <>
        <Icon name="user-v2" size={16} />
        <FormattedMessage defaultMessage="Followers" id="pzTOmv" />
      </>
    ),
    value: ProfileTabType.FOLLOWERS,
  },
  Follows: {
    text: (
      <>
        <Icon name="stars" size={16} />
        <FormattedMessage defaultMessage="Follows" id="IKKHqV" />
      </>
    ),
    value: ProfileTabType.FOLLOWS,
  },
  Zaps: {
    text: (
      <>
        <Icon name="zap-solid" size={16} />
        <FormattedMessage defaultMessage="Zaps" id="OEW7yJ" />
      </>
    ),
    value: ProfileTabType.ZAPS,
  },
  Muted: {
    text: (
      <>
        <Icon name="mute" size={16} />
        <FormattedMessage defaultMessage="Muted" id="HOzFdo" />
      </>
    ),
    value: ProfileTabType.MUTED,
  },
  Blocked: {
    text: (
      <>
        <Icon name="block" size={16} />
        <FormattedMessage defaultMessage="Blocked" id="qUJTsT" />
      </>
    ),
    value: ProfileTabType.BLOCKED,
  },
  Relays: {
    text: (
      <>
        <Icon name="wifi" size={16} />
        <FormattedMessage defaultMessage="Relays" id="RoOyAh" />
      </>
    ),
    value: ProfileTabType.RELAYS,
  },
  Bookmarks: {
    text: (
      <>
        <Icon name="bookmark-solid" size={16} />
        <FormattedMessage defaultMessage="Bookmarks" id="nGBrvw" />
      </>
    ),
    value: ProfileTabType.BOOKMARKS,
  },
} as { [key: string]: Tab };

export default ProfileTabSelectors;
