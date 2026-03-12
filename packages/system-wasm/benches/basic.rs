use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion};
use rand::prelude::*;
use std::collections::HashSet;
use system_wasm::diff::diff_filter;
use system_wasm::filter::{FlatReqFilter, ReqFilter};
use system_wasm::verify::{verify_batch, verify_event};
use system_wasm::{pow, Event};

fn random_pubkey(rng: &mut ThreadRng) -> String {
    let mut bytes = [0u8; 32];
    rng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{:02x}", byte)).collect()
}

/// A real, valid Nostr event used for verification benchmarks.
fn real_event() -> Event {
    serde_json::from_value(serde_json::json!({
      "content": "Oh i think it doesnt work until you reload",
      "created_at": 1695568849,
      "id": "0000051bca8ee62220b34827358dca69284734a2e7420f3c4b814901a531c767",
      "kind": 1,
      "pubkey": "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
      "sig": "0c18bfcde49fd42c7faf93b3ecd7caf10f0414c9ee3234fca96ea0bbb1a805cb2767fc067dc1a743420c499b34c232e19b73beb2f1fe47c18a2856c67bdef983",
      "tags": [
        ["e","ad17146f086345a12583b537daabdf49ccc5cd09e2c0b4816c835f397b693e6b","wss://nos.lol/","root"],
        ["e","72759bf1f525e9715f4e6d22381f53dc4d2ab47d7aaac11340e7fced13e10b11","wss://nos.lol/","reply"],
        ["p","63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed"],
        ["p","1bc70a0148b3f316da33fe3c89f23e3e71ac4ff998027ec712b905cd24f6a411"],
        ["nonce","7403","18"]
      ]
    })).unwrap()
}

fn criterion_benchmark(c: &mut Criterion) {
    let mut rng = thread_rng();
    let mut random_pubkeys = HashSet::new();
    for _ in 0..50 {
        random_pubkeys.insert(random_pubkey(&mut rng));
    }
    let input_authors = ReqFilter {
        authors: Some(random_pubkeys.clone()),
        kinds: Some(HashSet::from([1, 2, 3])),
        ..Default::default()
    };

    let input_authors_diff = ReqFilter {
        authors: Some(random_pubkeys.clone()),
        kinds: Some(HashSet::from([1, 2, 3, 4, 5])),
        ..Default::default()
    };

    // ── filter benchmarks ────────────────────────────────────────────────────

    c.bench_function("expand", |b| {
        b.iter(|| {
            let _: Vec<FlatReqFilter> = (&input_authors).into();
        })
    });
    c.bench_function("diff", |b| {
        b.iter(|| {
            let prev: Vec<FlatReqFilter> = (&input_authors).into();
            let next: Vec<FlatReqFilter> = (&input_authors_diff).into();
            let _ = diff_filter(&prev, &next);
        })
    });

    // ── PoW ──────────────────────────────────────────────────────────────────

    c.bench_function("pow", |b| {
        b.iter(|| {
            let mut ev = Event {
                id: None,
                kind: 1,
                created_at: 1234567,
                pubkey: "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed"
                    .to_string(),
                content: "test".to_owned(),
                sig: None,
                tags: vec![],
            };
            pow::pow(&mut ev, 12);
        })
    });

    // ── single-event verification ─────────────────────────────────────────────

    let ev = real_event();

    c.bench_function("verify_single", |b| {
        b.iter(|| {
            let _ = verify_event(&ev, false);
        })
    });

    // trust_id=true skips sha256+JSON serialisation; measures pure secp256k1 cost
    c.bench_function("verify_single_trust_id", |b| {
        b.iter(|| {
            let _ = verify_event(&ev, true);
        })
    });

    // ── batch verification: N events per call ─────────────────────────────────
    //
    // Compares verify_event called N times vs verify_batch with N events.
    // The difference measures the cost of calling into verify logic N times
    // vs once — relevant because in WASM, the JS→WASM call itself has
    // per-call overhead on top of the cryptographic work.

    let mut group = c.benchmark_group("verify_batch");
    for n in [1usize, 4, 16, 64, 256] {
        let batch: Vec<Event> = (0..n).map(|_| ev.clone()).collect();

        group.bench_with_input(BenchmarkId::new("sequential", n), &batch, |b, events| {
            b.iter(|| {
                for e in events {
                    let _ = verify_event(e, false);
                }
            })
        });

        group.bench_with_input(BenchmarkId::new("batch", n), &batch, |b, events| {
            b.iter(|| {
                let _ = verify_batch(events);
            })
        });
    }
    group.finish();
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
