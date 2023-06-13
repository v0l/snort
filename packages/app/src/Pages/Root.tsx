import "./Root.css";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, RouteObject, useLocation, useNavigate, useParams } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";

import Tabs, { Tab } from "Element/Tabs";
import Timeline from "Element/Timeline";
import { System } from "index";
import { TimelineSubject } from "Feed/TimelineFeed";
import { debounce, getRelayName, sha256, unixNow, unwrap } from "SnortUtils";
import useLogin from "Hooks/useLogin";
import Discover from "Pages/Discover";

import messages from "./messages";

interface RelayOption {
  url: string;
  paid: boolean;
}

export default function RootPage() {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey: pubKey, tags, preferences } = useLogin();

  const RootTab: Record<string, Tab> = {
    Notes: {
      text: formatMessage(messages.Notes),
      value: 0,
      data: "/notes",
    },
    Conversations: {
      text: formatMessage(messages.Conversations),
      value: 1,
      data: "/conversations",
    },
    Global: {
      text: formatMessage(messages.Global),
      value: 2,
      data: "/global",
    },
    Discover: {
      text: formatMessage({ defaultMessage: "Discover" }),
      value: 3,
      data: "/discover",
    },
  };

  const tagTabs = tags.item.map((t, idx) => {
    return { text: `#${t}`, value: idx + 3, data: `/tag/${t}` };
  });
  const tabs = [RootTab.Notes, RootTab.Conversations, RootTab.Global, RootTab.Discover, ...tagTabs];
  const tab = useMemo(() => {
    const pTab = location.pathname.split("/").slice(-1)[0];

    if (location.pathname.startsWith("/tag")) {
      const selectedTag = tagTabs.find(t => t.text.slice(1) === pTab);

      if (selectedTag) {
        return selectedTag;
      }
    }

    switch (pTab) {
      case "conversations": {
        return RootTab.NotesAndReplies;
      }
      case "global": {
        return RootTab.Global;
      }
      case "discover": {
        return RootTab.Discover;
      }
      default: {
        return RootTab.Notes;
      }
    }
  }, [location]);

  useEffect(() => {
    if (location.pathname === "/") {
      const t = pubKey ? preferences.defaultRootTab ?? tab.data : "/global";
      navigate(t, {
        replace: true,
      });
    }
  }, [location]);

  return (
    <>
      <div className="main-content">
        {pubKey && <Tabs tabs={tabs} tab={tab} setTab={t => navigate(unwrap(t.data))} />}
      </div>
      <div className="main-content">
        <Outlet />
      </div>
    </>
  );
}

const FollowsHint = () => {
  const { publicKey: pubKey, follows } = useLogin();
  if (follows.item?.length === 0 && pubKey) {
    return (
      <FormattedMessage
        {...messages.NoFollows}
        values={{
          newUsersPage: (
            <Link to={"/new/discover"}>
              <FormattedMessage {...messages.NewUsers} />
            </Link>
          ),
        }}
      />
    );
  }
  return null;
};

const GlobalTab = () => {
  const { relays } = useLogin();
  const [relay, setRelay] = useState<RelayOption>();
  const [allRelays, setAllRelays] = useState<RelayOption[]>();
  const [now] = useState(unixNow());

  const subject: TimelineSubject = {
    type: "global",
    items: [],
    discriminator: `all-${sha256(relay?.url ?? "").slice(0, 12)}`,
  };

  function globalRelaySelector() {
    if (!allRelays || allRelays.length === 0) return null;

    const paidRelays = allRelays.filter(a => a.paid);
    const publicRelays = allRelays.filter(a => !a.paid);
    return (
      <div className="flex mb10 f-end nowrap">
        <FormattedMessage
          defaultMessage="Read global from"
          description="Label for reading global feed from specific relays"
        />
        &nbsp;
        <select
          className="f-ellipsis"
          onChange={e => setRelay(allRelays.find(a => a.url === e.target.value))}
          value={relay?.url}>
          {paidRelays.length > 0 && (
            <optgroup label="Paid Relays">
              {paidRelays.map(a => (
                <option key={a.url} value={a.url}>
                  {getRelayName(a.url)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Public Relays">
            {publicRelays.map(a => (
              <option key={a.url} value={a.url}>
                {getRelayName(a.url)}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    );
  }

  useEffect(() => {
    return debounce(500, () => {
      const ret: RelayOption[] = [];
      System.Sockets.forEach(v => {
        ret.push({
          url: v.address,
          paid: v.info?.limitation?.payment_required ?? false,
        });
      });
      ret.sort(a => (a.paid ? -1 : 1));

      if (ret.length > 0 && !relay) {
        setRelay(ret[0]);
      }
      setAllRelays(ret);
    });
  }, [relays, relay]);

  return (
    <>
      {globalRelaySelector()}
      {relay && (
        <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} window={600} relay={relay.url} now={now} />
      )}
    </>
  );
};

const NotesTab = () => {
  const { follows, publicKey } = useLogin();
  const subject: TimelineSubject = {
    type: "pubkey",
    items: follows.item,
    discriminator: `follows:${publicKey?.slice(0, 12)}`,
  };

  return (
    <>
      <FollowsHint />
      <Timeline subject={subject} postsOnly={true} method={"TIME_RANGE"} window={undefined} relay={undefined} />
    </>
  );
};

const ConversationsTab = () => {
  const { follows, publicKey } = useLogin();
  const subject: TimelineSubject = {
    type: "pubkey",
    items: follows.item,
    discriminator: `follows:${publicKey?.slice(0, 12)}`,
  };

  return <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} window={undefined} relay={undefined} />;
};

const TagsTab = () => {
  const { tag } = useParams();
  const subject: TimelineSubject = { type: "hashtag", items: [tag ?? ""], discriminator: `tags-${tag}` };

  return <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} window={undefined} relay={undefined} />;
};

export const RootRoutes = [
  {
    path: "/",
    element: <RootPage />,
    children: [
      {
        path: "global",
        element: <GlobalTab />,
      },
      {
        path: "notes",
        element: <NotesTab />,
      },
      {
        path: "conversations",
        element: <ConversationsTab />,
      },
      {
        path: "discover",
        element: <Discover />,
      },
      {
        path: "tag/:tag",
        element: <TagsTab />,
      },
    ],
  },
] as RouteObject[];
