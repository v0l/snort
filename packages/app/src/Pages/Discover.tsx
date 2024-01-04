import { useState } from "react";
import { useIntl } from "react-intl";

import SuggestedProfiles from "@/Components/SuggestedProfiles";
import { Tab, TabElement } from "@/Components/Tabs/Tabs";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import TrendingUsers from "@/Components/Trending/TrendingUsers";

export default function Discover() {
  const { formatMessage } = useIntl();
  // tabs
  const Tabs = {
    Follows: { text: formatMessage({ defaultMessage: "Suggested Follows", id: "C8HhVE" }), value: 0 },
    Posts: { text: formatMessage({ defaultMessage: "Trending Notes", id: "Ix8l+B" }), value: 1 },
    Profiles: { text: formatMessage({ defaultMessage: "Trending People", id: "CVWeJ6" }), value: 2 },
  };
  const [tab, setTab] = useState<Tab>(Tabs.Follows);

  function renderTab() {
    switch (tab.value) {
      case 0:
        return <SuggestedProfiles />;
      case 1:
        return <TrendingNotes />;
      case 2:
        return <TrendingUsers />;
    }
    return null;
  }

  return (
    <>
      <div className="tabs p">
        {[Tabs.Follows, Tabs.Posts, Tabs.Profiles].map(a => (
          <TabElement key={a.value} tab={tab} setTab={setTab} t={a} />
        ))}
      </div>
      {renderTab()}
    </>
  );
}
