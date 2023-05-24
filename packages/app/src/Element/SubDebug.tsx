import "./SubDebug.css";
import { useState } from "react";

import useRelayState from "Feed/RelayState";
import Tabs, { Tab } from "Element/Tabs";
import { System } from "System";
import { unwrap } from "SnortUtils";
import useSystemState from "Hooks/useSystemState";
import { RawReqFilter } from "@snort/nostr";
import { useCopy } from "useCopy";

function RelayInfo({ id }: { id: string }) {
  const state = useRelayState(id);
  return <div key={id}>{state?.connected ? <>{id}</> : <s>{id}</s>}</div>;
}

function Queries() {
  const qs = useSystemState();
  const { copy } = useCopy();

  function countElements(filters: Array<RawReqFilter>) {
    let total = 0;
    for (const f of filters) {
      for (const v of Object.values(f)) {
        if (Array.isArray(v)) {
          total += v.length;
        }
      }
    }
    return total;
  }

  function queryInfo(q: {
    id: string;
    filters: Array<RawReqFilter>;
    closing: boolean;
    subFilters: Array<RawReqFilter>;
  }) {
    return (
      <div key={q.id}>
        {q.closing ? <s>{q.id}</s> : <>{q.id}</>}
        <br />
        <span onClick={() => copy(JSON.stringify(q.filters))} className="pointer">
          &nbsp; Filters: {q.filters.length} ({countElements(q.filters)} elements)
        </span>
        <br />
        <span onClick={() => copy(JSON.stringify(q.subFilters))} className="pointer">
          &nbsp; SubQueries: {q.subFilters.length} ({countElements(q.subFilters)} elements)
        </span>
      </div>
    );
  }

  return (
    <>
      <b>Queries</b>
      {qs?.queries.map(v => queryInfo(v))}
    </>
  );
}

const SubDebug = () => {
  const [onTab, setTab] = useState(0);

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
            return <Queries />;
          default:
            return null;
        }
      })()}
    </div>
  );
};

export default SubDebug;
