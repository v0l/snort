import { bytesToHex } from "@noble/hashes/utils";
import { DefaultQueryOptimizer, FlatReqFilter, QueryOptimizer, ReqFilter } from "@snort/system";
import { compress, expand_filter, flat_merge, get_diff, default as wasmInit } from "@snort/system-query";
import WasmPath from "@snort/system-query/pkg/system_query_bg.wasm";
import { Bench } from 'tinybench';

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
    }
  } as QueryOptimizer;
  
  const makeOnePubkey = () => {
    const rnd = globalThis.crypto.getRandomValues(new Uint8Array(32));
    return bytesToHex(rnd);
  }

  const randomPubkeys = (() => {
    const ret = [];
    for(let x =0;x<50;x++) {
        ret.push(makeOnePubkey());
    }
    return ret;
  })();

  const testExpand = (q: QueryOptimizer) => {
        q.expandFilter({
            kinds: [1, 6, 7, 6969],
            authors: randomPubkeys
        });
  }
  const testGetDiff = (q: QueryOptimizer) => {
    q.getDiff([{
        kinds: [1, 2, 3],
        authors: randomPubkeys
    }], [{
        kinds: [1, 2, 3, 4, 5],
        authors: randomPubkeys
    }]);
}
const testFlatMerge = (q: QueryOptimizer) => {
    q.flatMerge(q.expandFilter({
        kinds: [1, 6, 7, 6969],
        authors: randomPubkeys
    }));
}
const testCompress = (q: QueryOptimizer) => {
    q.compress([
        {
            kinds: [1, 6, 7, 6969],
            authors: randomPubkeys
        },
        {
            kinds: [1, 6, 7, 6969],
            authors: randomPubkeys
        },
        {
            kinds: [1, 6, 7, 6969],
            authors: randomPubkeys
        },
        {
            kinds: [1, 6, 7, 6969],
            authors: randomPubkeys
        },
        {
            kinds: [1, 6, 7, 6969],
            authors: randomPubkeys
        }
    ])
}

  const wasmSuite = new Bench({ time: 1_000 });
  const suite = new Bench({ time: 1_000 });

  const addTests = (s: Bench, q: QueryOptimizer) => {
    s.add("expand", () => testExpand(q));
    s.add("get_diff", () => testGetDiff(q));
    s.add("flat_merge", () => testFlatMerge(q));
    s.add("compress", () => testCompress(q));
  }
  
  addTests(suite, DefaultQueryOptimizer);
  addTests(wasmSuite, WasmQueryOptimizer);
 
  const runAll = async() => {
    await wasmInit(WasmPath);

    console.log("DefaultQueryOptimizer");
    await suite.run();
    console.table(suite.table());

    console.log("WasmQueryOptimizer");
    await wasmSuite.run();
    console.table(wasmSuite.table());
  };
  runAll().catch(console.error);