use std::collections::HashSet;

use crate::FlatReqFilter;

/// Return the filters in `next` that are not present in `prev`.
///
/// Previously used `itertools::Itertools::contains` which is O(n*m). Building
/// a `HashSet` from `prev` reduces this to O(n + m) — critical when both slices
/// can be very large (e.g. 50 pubkeys × 5 kinds = 250 entries each side).
pub fn diff_filter(prev: &[FlatReqFilter], next: &[FlatReqFilter]) -> Vec<FlatReqFilter> {
    let prev_set: HashSet<&FlatReqFilter> = prev.iter().collect();
    next.iter()
        .filter(|n| !prev_set.contains(n))
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simple_diff_same() {
        let prev = vec![FlatReqFilter {
            id: Some("a".to_owned()),
            ..Default::default()
        }];
        let next = vec![FlatReqFilter {
            id: Some("a".to_owned()),
            ..Default::default()
        }];

        let result = diff_filter(&prev, &next);
        assert_eq!(result, vec![])
    }

    #[test]
    fn simple_diff_add() {
        let prev = vec![FlatReqFilter {
            id: Some("a".to_owned()),
            ..Default::default()
        }];
        let next = vec![
            FlatReqFilter {
                id: Some("a".to_owned()),
                ..Default::default()
            },
            FlatReqFilter {
                id: Some("b".to_owned()),
                ..Default::default()
            },
        ];

        let result = diff_filter(&prev, &next);
        assert_eq!(
            result,
            vec![FlatReqFilter {
                id: Some("b".to_owned()),
                ..Default::default()
            }]
        )
    }

    #[test]
    fn simple_diff_replace() {
        let prev = vec![FlatReqFilter {
            id: Some("a".to_owned()),
            ..Default::default()
        }];
        let next = vec![FlatReqFilter {
            id: Some("b".to_owned()),
            ..Default::default()
        }];

        let result = diff_filter(&prev, &next);
        assert_eq!(
            result,
            vec![FlatReqFilter {
                id: Some("b".to_owned()),
                ..Default::default()
            }]
        )
    }
}
