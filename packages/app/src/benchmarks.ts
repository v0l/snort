import { bytesToHex } from "@noble/hashes/utils";
import { DefaultQueryOptimizer, EventExt, FlatReqFilter, PowMiner, QueryOptimizer, ReqFilter } from "@snort/system";
import { compress, expand_filter, flat_merge, get_diff, pow, default as wasmInit } from "@snort/system-wasm";
import WasmPath from "@snort/system-wasm/pkg/system_wasm_bg.wasm";

const WasmQueryOptimizer = {
  expandFilter: (f: ReqFilter) => {
    return expand_filter(f) as Array<FlatReqFilter>;
  },
  getDiff: (prev: Array<ReqFilter>, next: Array<ReqFilter>) => {
    return get_diff(prev, next) as Array<FlatReqFilter>;
  },
  flatMerge: (all: Array<FlatReqFilter>) => {
    return flat_merge(all) as Array<ReqFilter>;
  },
  compress: (all: Array<ReqFilter>) => {
    return compress(all) as Array<ReqFilter>;
  },
} as QueryOptimizer;

const makeOnePubkey = () => {
  const rnd = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(rnd);
};

const randomPubkeys = (() => {
  const ret = [];
  for (let x = 0; x < 50; x++) {
    ret.push(makeOnePubkey());
  }
  return ret;
})();

const testExpand = (q: QueryOptimizer) => {
  q.expandFilter({
    kinds: [1, 2, 3],
    authors: randomPubkeys,
  });
};
const testGetDiff = (q: QueryOptimizer) => {
  q.getDiff(
    [
      {
        kinds: [1, 2, 3],
        authors: randomPubkeys,
      },
    ],
    [
      {
        kinds: [1, 2, 3, 4, 5],
        authors: randomPubkeys,
      },
    ],
  );
};
const testFlatMerge = (q: QueryOptimizer) => {
  q.flatMerge(
    q.expandFilter({
      kinds: [1, 6, 7, 6969],
      authors: randomPubkeys,
    }),
  );
};
const testCompress = (q: QueryOptimizer) => {
  q.compress([
    {
      kinds: [1, 6, 7, 6969],
      authors: randomPubkeys,
    },
    {
      kinds: [1, 6, 7, 6969],
      authors: randomPubkeys,
    },
    {
      kinds: [1, 6, 7, 6969],
      authors: randomPubkeys,
    },
    {
      kinds: [1, 6, 7, 6969],
      authors: randomPubkeys,
    },
    {
      kinds: [1, 6, 7, 6969],
      authors: randomPubkeys,
    },
  ]);
};

const runAll = async () => {
  await wasmInit(WasmPath);

  const tinybench = await import("tinybench");

  const { Bench } = tinybench;
  const wasmSuite = new Bench({ time: 1_000 });
  const suite = new Bench({ time: 1_000 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addTests = (s: any, q: QueryOptimizer, p: PowMiner) => {
    s.add("expand", () => testExpand(q));
    s.add("get_diff", () => testGetDiff(q));
    s.add("flat_merge", () => testFlatMerge(q));
    s.add("compress", () => testCompress(q));
    s.add("pow", () => {
      const ev = {
        id: "",
        kind: 1,
        created_at: 1234567,
        pubkey: "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
        content: "test",
        sig: "",
        tags: [],
      };
      p.minePow(ev, 12);
    });
  };

  addTests(suite, DefaultQueryOptimizer, {
    minePow(ev, target) {
      return Promise.resolve(EventExt.minePow(ev, target));
    },
  });
  addTests(wasmSuite, WasmQueryOptimizer, {
    minePow(ev, target) {
      return Promise.resolve(pow(ev, target));
    },
  });

  console.log("DefaultQueryOptimizer");
  await suite.run();
  console.table(suite.table());
  const p0 = document.createElement("pre");
  p0.innerText = JSON.stringify(suite.table(), undefined, "  ");
  document.body.appendChild(p0);

  console.log("WasmQueryOptimizer");
  await wasmSuite.run();
  console.table(wasmSuite.table());
  const p1 = document.createElement("pre");
  p1.innerText = JSON.stringify(wasmSuite.table(), undefined, "  ");
  document.body.appendChild(p1);
};
runAll().catch(console.error);
