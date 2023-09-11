use crate::filter::CanMerge;

pub fn merge<'a, T, Z>(all: Vec<&'a T>) -> Vec<Z>
where
    T: CanMerge,
    for<'b> Z: CanMerge + From<Vec<&'a T>> + From<Vec<&'b Z>>,
{
    let mut ret: Vec<Z> = merge_once(all);
    loop {
        let last_len = ret.len();
        ret = merge_once(ret.iter().collect());
        if last_len == ret.len() {
            break;
        }
    }
    ret
}

fn merge_once<'a, T, Z>(all: Vec<&'a T>) -> Vec<Z>
where
    T: CanMerge,
    Z: From<Vec<&'a T>>,
{
    let mut ret: Vec<Z> = vec![];
    if all.is_empty() {
        return ret;
    }

    let merge_sets: Vec<Vec<&T>> = vec![vec![all.first().unwrap()]];
    let merge_sets = all.iter().skip(1).fold(merge_sets, |mut acc, x| {
        let mut did_match = false;
        for y in acc.iter_mut() {
            if y.iter().all(|z| z.can_merge(x)) {
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

    for s in merge_sets {
        ret.push(Z::from(s));
    }

    ret
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::filter::{Distance, FlatReqFilter, ReqFilter};
    use std::collections::HashSet;

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
        assert_eq!(a.distance(&b), 0);
        assert_eq!(a.distance(&c), 1);
        assert_eq!(a.distance(&d), 10);
        assert_eq!(a.distance(&e), 11);
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
            ids: Some(HashSet::from(["0".to_owned()])),
            authors: Some(HashSet::from(["a".to_owned(), "b".to_owned()])),
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
        assert_eq!(ReqFilter::from(vec![&a, &b]), output);
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
        assert!(&a.can_merge(&b));
        assert!(!&b.can_merge(&c));
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
                ids: Some(HashSet::from(["0".to_owned()])),
                authors: Some(HashSet::from([
                    "a".to_owned(),
                    "b".to_owned(),
                    "c".to_owned(),
                ])),
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
                kinds: Some(HashSet::from([1, 2])),
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
                authors: Some(HashSet::from(["c".to_owned()])),
                kinds: Some(HashSet::from([1])),
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
                authors: Some(HashSet::from(["c".to_owned()])),
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
                ids: Some(HashSet::from(["1".to_owned()])),
                authors: Some(HashSet::from(["c".to_owned()])),
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

        assert_eq!(
            merge::<FlatReqFilter, ReqFilter>(input.iter().collect()),
            output
        )
    }
}
