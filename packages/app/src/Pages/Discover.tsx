import { useState } from "react";
import { useIntl } from "react-intl";

import TabSelectors, { Tab } from "@/Components/TabSelectors/TabSelectors";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import TrendingUsers from "@/Components/Trending/TrendingUsers";

export default function Discover() {
  const { formatMessage } = useIntl();
  // tabs
  const Tabs = {
    Posts: { text: formatMessage({ defaultMessage: "Trending Notes" }), value: 1 },
    Profiles: { text: formatMessage({ defaultMessage: "Trending People" }), value: 0 },
  };
  const [tab, setTab] = useState<Tab>(Tabs.Profiles);

  function renderTab() {
    switch (tab.value) {
      case 1:
        return <TrendingNotes />;
      case 0:
        return (
          <div className="p">
            <TrendingUsers />
          </div>
        );
    }
    return null;
  }

  return (
    <>
      <TabSelectors tabs={[Tabs.Profiles, Tabs.Posts]} tab={tab} setTab={setTab} />
      {renderTab()}
    </>
  );
}
