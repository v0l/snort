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
            ..Default::default()
        };
        let b = FlatReqFilter {
            id: Some("a".to_owned()),
            ..Default::default()
        };
        let c = FlatReqFilter {
            id: Some("c".to_owned()),
            ..Default::default()
        };
        let d = FlatReqFilter {
            id: Some("a".to_owned()),
            kind: Some(1),
            ..Default::default()
        };
        let e = FlatReqFilter {
            id: Some("e".to_owned()),
            kind: Some(1),
            ..Default::default()
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
            limit: Some(10),
            ..Default::default()
        };
        let b = FlatReqFilter {
            id: Some("0".to_owned()),
            author: Some("b".to_owned()),
            limit: Some(10),
            ..Default::default()
        };

        let output = ReqFilter {
            ids: Some(HashSet::from(["0".to_owned()])),
            authors: Some(HashSet::from(["a".to_owned(), "b".to_owned()])),
            limit: Some(10),
            ..Default::default()
        };
        assert_eq!(ReqFilter::from(vec![&a, &b]), output);
    }

    #[test]
    fn can_merge_filters() {
        let a = FlatReqFilter {
            id: Some("0".to_owned()),
            author: Some("a".to_owned()),
            limit: Some(10),
            ..Default::default()
        };
        let b = FlatReqFilter {
            id: Some("0".to_owned()),
            author: Some("b".to_owned()),
            limit: Some(10),
            ..Default::default()
        };
        let c = FlatReqFilter {
            id: Some("0".to_owned()),
            author: Some("b".to_owned()),
            limit: Some(100),
            ..Default::default()
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
                ..Default::default()
            },
            FlatReqFilter {
                id: Some("0".to_owned()),
                author: Some("b".to_owned()),
                ..Default::default()
            },
            FlatReqFilter {
                kind: Some(1),
                ..Default::default()
            },
            FlatReqFilter {
                kind: Some(2),
                ..Default::default()
            },
            FlatReqFilter {
                kind: Some(2),
                ..Default::default()
            },
            FlatReqFilter {
                id: Some("0".to_owned()),
                author: Some("c".to_owned()),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(1),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                limit: Some(100),
                ..Default::default()
            },
            FlatReqFilter {
                id: Some("1".to_owned()),
                author: Some("c".to_owned()),
                ..Default::default()
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
                ..Default::default()
            },
            ReqFilter {
                kinds: Some(HashSet::from([1, 2])),
                ..Default::default()
            },
            ReqFilter {
                authors: Some(HashSet::from(["c".to_owned()])),
                kinds: Some(HashSet::from([1])),
                ..Default::default()
            },
            ReqFilter {
                authors: Some(HashSet::from(["c".to_owned()])),
                limit: Some(100),
                ..Default::default()
            },
            ReqFilter {
                ids: Some(HashSet::from(["1".to_owned()])),
                authors: Some(HashSet::from(["c".to_owned()])),
                ..Default::default()
            },
        ];

        assert_eq!(
            merge::<FlatReqFilter, ReqFilter>(input.iter().collect()),
            output
        )
    }
}
