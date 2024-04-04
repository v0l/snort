use crate::FlatReqFilter;
use itertools::Itertools;

pub fn diff_filter(prev: &Vec<FlatReqFilter>, next: &Vec<FlatReqFilter>) -> Vec<FlatReqFilter> {
    let mut added: Vec<FlatReqFilter> = vec![];

    for n in next.iter() {
        if !prev.iter().contains(&n) {
            added.push(n.clone())
        }
    }

    added
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
