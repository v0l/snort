import classNames from "classnames";
import { FormattedMessage } from "react-intl";

import { RightColumnWidget } from "@/Components/RightWidgets";
import LatestArticlesWidget from "@/Components/RightWidgets/articles";
import { BaseWidget } from "@/Components/RightWidgets/base";
import InviteFriendsWidget from "@/Components/RightWidgets/invite-friends";
import MiniStreamWidget from "@/Components/RightWidgets/mini-stream";
import SearchBox from "@/Components/SearchBox/SearchBox";
import { TaskList } from "@/Components/Tasks/TaskList";
import TrendingHashtags from "@/Components/Trending/TrendingHashtags";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import TrendingUsers from "@/Components/Trending/TrendingUsers";
import useLogin from "@/Hooks/useLogin";
import useWindowSize from "@/Hooks/useWindowSize";

export default function RightColumn() {
  const { pubkey } = useLogin(s => ({ pubkey: s.publicKey }));
  const hideRightColumnPaths = ["/login", "/new", "/messages"];
  const show = !hideRightColumnPaths.some(path => globalThis.location.pathname.startsWith(path));

  const pageSize = useWindowSize();
  const isDesktop = pageSize.width >= 1024; //max-xl
  if (!isDesktop) return;

  const widgets = pubkey
    ? [
        RightColumnWidget.TaskList,
        RightColumnWidget.InviteFriends,
        //RightColumnWidget.LiveStreams,
        RightColumnWidget.TrendingNotes,
        RightColumnWidget.LatestArticls,
        RightColumnWidget.TrendingPeople,
        RightColumnWidget.TrendingHashtags,
      ]
    : [RightColumnWidget.TrendingPeople, RightColumnWidget.TrendingHashtags];

  const getWidget = (t: RightColumnWidget) => {
    switch (t) {
      case RightColumnWidget.TaskList:
        return <TaskList />;
      case RightColumnWidget.TrendingNotes:
        return (
          <BaseWidget title={<FormattedMessage defaultMessage="Trending Notes" />}>
            <TrendingNotes small={true} count={6} />
          </BaseWidget>
        );
      case RightColumnWidget.TrendingPeople:
        return (
          <BaseWidget title={<FormattedMessage defaultMessage="Trending People" />}>
            <TrendingUsers
              count={6}
              followListProps={{
                showFollowAll: false,
                profilePreviewProps: {
                  actions: pubkey ? undefined : <></>,
                  profileImageProps: {
                    size: 32,
                  },
                },
              }}
            />
          </BaseWidget>
        );
      case RightColumnWidget.TrendingHashtags:
        return (
          <BaseWidget title={<FormattedMessage defaultMessage="Popular Hashtags" />}>
            <TrendingHashtags short={true} count={6} />
          </BaseWidget>
        );
      case RightColumnWidget.InviteFriends:
        return <InviteFriendsWidget />;
      case RightColumnWidget.LiveStreams:
        return <MiniStreamWidget />;
      case RightColumnWidget.LatestArticls:
        return <LatestArticlesWidget />;
    }
  };

  return (
    <div
      className={classNames(
        "flex-col hidden lg:w-1/3 sticky top-0 h-screen py-3 px-4 border-l border-neutral-900 light:border-neutral-300",
        {
          "lg:flex": show,
        },
      )}>
      <div>
        <SearchBox />
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto hide-scrollbar">{widgets.map(getWidget)}</div>
    </div>
  );
}
