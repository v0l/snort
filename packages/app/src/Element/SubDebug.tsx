import useRelayState from "Feed/RelayState";
import { useState } from "react";
import { Query, System } from "System";
import "./SubDebug.css";
import Tabs, { Tab } from "Element/Tabs";
import { unwrap } from "Util";

function RelayInfo({ id }: { id: string }) {
  const state = useRelayState(id);
  return (
    <div key={id}>
      {state?.connected ? <>{id}</> : <s>{id}</s>}
      <br />
      {state?.subs?.map(a => (
        <>
          &nbsp; &nbsp;
          {a.Id}
          <br />
        </>
      ))}
    </div>
  );
}

const SubDebug = () => {
  const [onTab, setTab] = useState(0);

  function queryInfo(q: Query) {
    return <div key={q.id}>{q.id}</div>;
  }

  function connections() {
    return (
      <>
        <b>Connections:</b>
        {[...System.Sockets.keys()].map(k => (
          <RelayInfo id={k} />
        ))}
      </>
    );
  }

  function queries() {
    return (
      <>
        <b>Queries</b>
        {[...System.Queries.entries()].map(([k, v]) => queryInfo(v))}
      </>
    );
  }

  const tabs: Tab[] = [
    {
      text: "Connections",
      value: 0,
    },
    {
      text: "Queries",
      value: 1,
    },
  ];

  return (
    <div className="sub-debug">
      <Tabs tabs={tabs} setTab={v => setTab(v.value)} tab={unwrap(tabs.find(a => a.value === onTab))} />
      {(() => {
        switch (onTab) {
          case 0:
            return connections();
          case 1:
            return queries();
          default:
            return null;
        }
      })()}
    </div>
  );
};

export default SubDebug;
