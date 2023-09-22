use criterion::{criterion_group, criterion_main, Criterion};
use rand::prelude::*;
use std::collections::HashSet;
use system_query::diff::diff_filter;
use system_query::filter::{FlatReqFilter, ReqFilter};

fn random_pubkey(rng: &mut ThreadRng) -> String {
    let mut bytes = [0u8; 32];
    rng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{:02x}", byte)).collect()
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
        ids: None,
        p_tag: None,
        t_tag: None,
        d_tag: None,
        r_tag: None,
        a_tag: None,
        g_tag: None,
        search: None,
        since: None,
        until: None,
        limit: None,
        e_tag: None,
    };

    let input_authors_diff = ReqFilter {
        authors: Some(random_pubkeys.clone()),
        kinds: Some(HashSet::from([1, 2, 3, 4, 5])),
        ids: None,
        p_tag: None,
        t_tag: None,
        d_tag: None,
        r_tag: None,
        a_tag: None,
        g_tag: None,
        search: None,
        since: None,
        until: None,
        limit: None,
        e_tag: None,
    };


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
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
