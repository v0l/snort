use crate::{FlatReqFilter, ReqFilter};
use itertools::Itertools;
use std::cmp::Ordering;

pub fn flat_merge(all: &Vec<FlatReqFilter>) -> Vec<ReqFilter> {
    let mut ret: Vec<ReqFilter> = vec![];

    let merge_sets: Vec<Vec<&FlatReqFilter>> = vec![vec![all.first().unwrap()]];
    let merge_sets = all
        .iter()
        .skip(1)
        .sorted_by(|a, b| match distance(&a, &b) {
            0 => Ordering::Equal,
            1 => Ordering::Less,
            _ => Ordering::Greater,
        })
        .fold(merge_sets, |mut acc, x| {
            let mut did_match = false;
            for y in acc.iter_mut() {
                if y.iter().all(|z| can_merge_filters(z, x)) {
                    y.push(x);
                    did_match = true;
                    break;
                }
            }
            if !did_match {
                acc.push(vec![x]);
            }
            acc
        });

    for s in merge_sets.iter() {
        ret.push(merge_set(s));
    }
    ret
}

fn merge_set(set: &Vec<&FlatReqFilter>) -> ReqFilter {
    let ret = ReqFilter {
        ids: None,
        authors: None,
        kinds: None,
        e_tag: None,
        p_tag: None,
        t_tag: None,
        d_tag: None,
        r_tag: None,
        search: None,
        since: None,
        until: None,
        limit: None,
    };
    set.iter().fold(ret, |mut acc, x| {
        array_prop_append(&x.id, &mut acc.ids);
        array_prop_append(&x.author, &mut acc.authors);
        array_prop_append(&x.kind, &mut acc.kinds);
        array_prop_append(&x.e_tag, &mut acc.e_tag);
        array_prop_append(&x.p_tag, &mut acc.p_tag);
        array_prop_append(&x.t_tag, &mut acc.t_tag);
        array_prop_append(&x.d_tag, &mut acc.d_tag);
        array_prop_append(&x.r_tag, &mut acc.r_tag);
        array_prop_append(&x.search, &mut acc.search);
        acc.since = x.since;
        acc.until = x.until;
        acc.limit = x.limit;

        acc
    })
}

fn can_merge_filters(a: &FlatReqFilter, b: &FlatReqFilter) -> bool {
    if a.since != b.since || a.until != b.until || a.limit != b.limit || a.search != b.search {
        return false;
    }

    distance(a, b) <= 1
}

/// Calculate the distance in terms of similarity for merging
///
/// The goal of this function is to find 2 filters which are very similar where
/// one filter may have a single property change like so:
///
/// ```javascript
/// const a = { "kinds": 1, "authors": "a", "since": 99 };
/// const b = { "kinds": 1, "authors": "b", "since": 99 };
/// ```
/// In this case these 2 filters could be merged because their distance is `1`
/// ```javascript
/// const result = { "kinds": [1], "authors": ["a", "b"], "since": 99 };
/// ```
fn distance(a: &FlatReqFilter, b: &FlatReqFilter) -> u32 {
    let mut ret = 0u32;

    ret += prop_dist(&a.id, &b.id);
    ret += prop_dist(&a.kind, &b.kind);
    ret += prop_dist(&a.author, &b.author);
    ret += prop_dist(&a.e_tag, &b.e_tag);
    ret += prop_dist(&a.p_tag, &b.p_tag);
    ret += prop_dist(&a.d_tag, &b.d_tag);
    ret += prop_dist(&a.r_tag, &b.r_tag);
    ret += prop_dist(&a.t_tag, &b.t_tag);
    ret += prop_dist(&a.search, &b.search);

    ret
}

#[inline(always)]
fn prop_dist<T: Eq>(a: &Option<T>, b: &Option<T>) -> u32 {
    if (a.is_some() && b.is_none()) || (a.is_none() && b.is_some()) {
        return 10;
    } else if a.is_some() && a != b {
        return 1;
    }
    0
}

#[inline(always)]
fn array_prop_append<T: Clone + Eq>(val: &Option<T>, arr: &mut Option<Vec<T>>) {
    if let Some(ap) = val {
        if arr.is_none() {
            *arr = Some(vec![ap.clone()])
        } else if !arr.as_ref().unwrap().contains(ap) {
            arr.as_mut().unwrap().push(ap.clone());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn distance() {
        let a = FlatReqFilter {
            id: Some("a".to_owned()),
            author: None,
            kind: None,
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: None,
        };
        let b = FlatReqFilter {
            id: Some("a".to_owned()),
            author: None,
            kind: None,
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: None,
        };
        let c = FlatReqFilter {
            id: Some("c".to_owned()),
            author: None,
            kind: None,
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: None,
        };
        let d = FlatReqFilter {
            id: Some("a".to_owned()),
            author: None,
            kind: Some(1),
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: None,
        };
        let e = FlatReqFilter {
            id: Some("e".to_owned()),
            author: None,
            kind: Some(1),
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: None,
        };
        assert_eq!(super::distance(&a, &b), 0);
        assert_eq!(super::distance(&a, &c), 1);
        assert_eq!(super::distance(&a, &d), 10);
        assert_eq!(super::distance(&a, &e), 11);
    }

    #[test]
    fn merge_set() {
        let a = FlatReqFilter {
            id: Some("0".to_owned()),
            author: Some("a".to_owned()),
            kind: None,
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: Some(10),
        };
        let b = FlatReqFilter {
            id: Some("0".to_owned()),
            author: Some("b".to_owned()),
            kind: None,
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: Some(10),
        };

        let output = ReqFilter {
            ids: Some(vec!["0".to_owned()]),
            authors: Some(vec!["a".to_owned(), "b".to_owned()]),
            kinds: None,
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: Some(10),
        };
        assert_eq!(super::merge_set(&vec![&a, &b]), output);
    }

    #[test]
    fn can_merge_filters() {
        let a = FlatReqFilter {
            id: Some("0".to_owned()),
            author: Some("a".to_owned()),
            kind: None,
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: Some(10),
        };
        let b = FlatReqFilter {
            id: Some("0".to_owned()),
            author: Some("b".to_owned()),
            kind: None,
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: Some(10),
        };
        let c = FlatReqFilter {
            id: Some("0".to_owned()),
            author: Some("b".to_owned()),
            kind: None,
            e_tag: None,
            p_tag: None,
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: None,
            until: None,
            limit: Some(100),
        };
        assert!(super::can_merge_filters(&a, &b));
        assert!(!super::can_merge_filters(&b, &c));
    }

    #[test]
    fn flat_merge() {
        let input = vec![
            FlatReqFilter {
                id: Some("0".to_owned()),
                author: Some("a".to_owned()),
                kind: None,
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            FlatReqFilter {
                id: Some("0".to_owned()),
                author: Some("b".to_owned()),
                kind: None,
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            FlatReqFilter {
                id: None,
                author: None,
                kind: Some(1),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            FlatReqFilter {
                id: None,
                author: None,
                kind: Some(2),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            FlatReqFilter {
                id: None,
                author: None,
                kind: Some(2),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            FlatReqFilter {
                id: Some("0".to_owned()),
                author: Some("c".to_owned()),
                kind: None,
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            FlatReqFilter {
                id: None,
                author: Some("c".to_owned()),
                kind: Some(1),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            FlatReqFilter {
                id: None,
                author: Some("c".to_owned()),
                kind: None,
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: Some(100),
            },
            FlatReqFilter {
                id: Some("1".to_owned()),
                author: Some("c".to_owned()),
                kind: None,
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
        ];
        let output = vec![
            ReqFilter {
                ids: Some(vec!["0".to_owned()]),
                authors: Some(vec!["a".to_owned(), "b".to_owned(), "c".to_owned()]),
                kinds: None,
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            ReqFilter {
                ids: None,
                authors: None,
                kinds: Some(vec![1, 2]),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            ReqFilter {
                ids: None,
                authors: Some(vec!["c".to_owned()]),
                kinds: Some(vec![1]),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
            ReqFilter {
                ids: None,
                authors: Some(vec!["c".to_owned()]),
                kinds: None,
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: Some(100),
            },
            ReqFilter {
                ids: Some(vec!["1".to_owned()]),
                authors: Some(vec!["c".to_owned()]),
                kinds: None,
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                limit: None,
            },
        ];

        assert_eq!(super::flat_merge(&input), output)
    }
}
