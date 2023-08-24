import { ReactNode, useEffect, useState } from "react";
import { Link, Outlet, RouteObject, useLocation, useNavigate, useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { Menu, MenuItem } from "@szhsin/react-menu";
import "./Root.css";

import Timeline from "Element/Timeline";
import { System } from "index";
import { TimelineSubject } from "Feed/TimelineFeed";
import { debounce, getRelayName, sha256, unixNow } from "SnortUtils";
import useLogin from "Hooks/useLogin";
import Discover from "Pages/Discover";
import Icon from "Icons/Icon";
import TrendingUsers from "Element/TrendingUsers";
import TrendingNotes from "Element/TrendingPosts";
import HashTagsPage from "Pages/HashTagsPage";
import SuggestedProfiles from "Element/SuggestedProfiles";
import { TaskList } from "Tasks/TaskList";

import messages from "./messages";

interface RelayOption {
  url: string;
  paid: boolean;
}

type RootPage = "following" | "conversations" | "trending-notes" | "trending-people" | "suggested" | "tags" | "global";

export default function RootPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey: pubKey, tags, preferences } = useLogin();
  const [rootType, setRootType] = useState<RootPage>("following");

  const menuItems = [
    {
      tab: "following",
      path: "/notes",
      show: Boolean(pubKey),
      element: (
        <>
          <Icon name="user-v2" />
          <FormattedMessage defaultMessage="Following" />
        </>
      ),
    },
    {
      tab: "trending-notes",
      path: "/trending/notes",
      show: true,
      element: (
        <>
          <Icon name="fire" />
          <FormattedMessage defaultMessage="Trending Notes" />
        </>
      ),
    },
    {
      tab: "conversations",
      path: "/conversations",
      show: Boolean(pubKey),
      element: (
        <>
          <Icon name="message-chat-circle" />
          <FormattedMessage defaultMessage="Conversations" />
        </>
      ),
    },
    {
      tab: "trending-people",
      path: "/trending/people",
      show: true,
      element: (
        <>
          <Icon name="user-up" />
          <FormattedMessage defaultMessage="Trending People" />
        </>
      ),
    },
    {
      tab: "suggested",
      path: "/suggested",
      show: Boolean(pubKey),
      element: (
        <>
          <Icon name="thumbs-up" />
          <FormattedMessage defaultMessage="Suggested Follows" />
        </>
      ),
    },
    {
      tab: "global",
      path: "/global",
      show: true,
      element: (
        <>
          <Icon name="globe" />
          <FormattedMessage defaultMessage="Global" />
        </>
      ),
    },
  ] as Array<{
    tab: RootPage;
    path: string;
    show: boolean;
    element: ReactNode;
  }>;

  useEffect(() => {
    if (location.pathname === "/") {
      const t = pubKey ? preferences.defaultRootTab ?? "/notes" : "/trending/notes";
      navigate(t);
    } else {
      const currentTab = menuItems.find(a => a.path === location.pathname)?.tab;
      if (currentTab) {
        setRootType(currentTab);
      }
    }
  }, [location]);

  function currentMenuItem() {
    if (location.pathname.startsWith("/t/")) {
      return (
        <>
          <Icon name="hash" />
          {location.pathname.split("/").slice(-1)}
        </>
      );
    }
    return menuItems.find(a => a.tab === rootType)?.element;
  }

  return (
    <>
      <div className="main-content root-type">
        <Menu
          menuButton={
            <button type="button">
              {currentMenuItem()}
              <Icon name="chevronDown" />
            </button>
          }
          align="center"
          menuClassName={() => "ctx-menu"}>
          <div className="close-menu-container">
            <MenuItem>
              <div className="close-menu" />
            </MenuItem>
          </div>
          {menuItems
            .filter(a => a.show)
            .map(a => (
              <MenuItem
                onClick={() => {
                  navigate(a.path);
                }}>
                {a.element}
              </MenuItem>
            ))}
          {tags.item.map(v => (
            <MenuItem
              onClick={() => {
                navigate(`/t/${v}`);
              }}>
              <Icon name="hash" />
              {v}
            </MenuItem>
          ))}
        </Menu>
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
    relay: relay?.url,
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
      {relay && <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} window={600} now={now} />}
    </>
  );
};

const NotesTab = () => {
  const { follows, publicKey } = useLogin();
  const subject: TimelineSubject = {
    type: "pubkey",
    items: follows.item,
    discriminator: `follows:${publicKey?.slice(0, 12)}`,
    streams: true,
  };

  return (
    <>
      <FollowsHint />
      <TaskList />
      <Timeline subject={subject} postsOnly={true} method={"TIME_RANGE"} />
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

  return <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} />;
};

const TagsTab = () => {
  const { tag } = useParams();
  const subject: TimelineSubject = {
    type: "hashtag",
    items: [tag ?? ""],
    discriminator: `tags-${tag}`,
    streams: true,
  };

  return <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} />;
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
      {
        path: "trending/notes",
        element: <TrendingNotes />,
      },
      {
        path: "trending/people",
        element: (
          <div className="p">
            <TrendingUsers />
          </div>
        ),
      },
      {
        path: "suggested",
        element: (
          <div className="p">
            <SuggestedProfiles />
          </div>
        ),
      },
      {
        path: "/t/:tag",
        element: <HashTagsPage />,
      },
    ],
  },
] as RouteObject[];
