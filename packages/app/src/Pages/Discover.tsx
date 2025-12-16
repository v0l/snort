import { FormattedMessage } from "react-intl";
import { BlindSpots } from "./Root/BlindSpots";
import TabSelectors, { type Tab } from "@/Components/TabSelectors/TabSelectors";
import { type ReactNode, useState } from "react";
import SuggestedProfiles from "@/Components/SuggestedProfiles";
import { useNavigate } from "react-router-dom";
import { FollowedByFriendsTab } from "./Root/FollowedByFriendsTab";
import FollowSetsPage from "./Root/FollowSets";

type DiscoverTab = Tab & {
  subTitle?: ReactNode;
};
export default function Discover() {
  const navigate = useNavigate();
  const tabs = [
    {
      text: <FormattedMessage defaultMessage="Popular" />,
      value: 0,
      subTitle: <FormattedMessage defaultMessage="Recent content that people you follow have reacted to." />,
    },
    {
      text: <FormattedMessage defaultMessage="Followed By Friends" />,
      value: 3,
      subTitle: (
        <FormattedMessage defaultMessage="Posts by users that you are not following directly, but your follows are following them." />
      ),
    },
    {
      text: <FormattedMessage defaultMessage="Follow Sets" />,
      value: 4,
      subTitle: <FormattedMessage defaultMessage="Curated lists of people to follow." />,
    },
    {
      text: <FormattedMessage defaultMessage="Suggested Follows" />,
      value: 2,
      subTitle: <FormattedMessage defaultMessage="DVM suggested users to follow." />,
    },
    {
      text: <FormattedMessage defaultMessage="Search" />,
      value: 1,
    },
  ] as Array<DiscoverTab>;
  const [tab, setTab] = useState<DiscoverTab>(tabs[0]);

  function renderTab() {
    switch (tab.value) {
      case 0:
        return <BlindSpots />;
      case 1:
        return <></>;
      case 2:
        return <SuggestedProfiles />;
      case 3:
        return <FollowedByFriendsTab />;
      case 4:
        return <FollowSetsPage />;
    }
  }

  return (
    <>
      <TabSelectors
        tab={tab}
        tabs={tabs}
        setTab={t => {
          if (t.value === 1) {
            navigate("/search");
          } else {
            setTab(t);
          }
        }}
        className="px-3"
      />
      {tab.subTitle && <div className="text-sm text-neutral-500 px-3 my-2">{tab.subTitle}</div>}
      {renderTab()}
    </>
  );
}
