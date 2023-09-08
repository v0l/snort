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
        }];
        let next = vec![FlatReqFilter {
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
        }];

        let result = diff_filter(&prev, &next);
        assert_eq!(result, vec![])
    }

    #[test]
    fn simple_diff_add() {
        let prev = vec![FlatReqFilter {
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
        }];
        let next = vec![
            FlatReqFilter {
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
            },
            FlatReqFilter {
                id: Some("b".to_owned()),
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
            },
        ];

        let result = diff_filter(&prev, &next);
        assert_eq!(
            result,
            vec![FlatReqFilter {
                id: Some("b".to_owned()),
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
            }]
        )
    }

    #[test]
    fn simple_diff_replace() {
        let prev = vec![FlatReqFilter {
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
        }];
        let next = vec![FlatReqFilter {
            id: Some("b".to_owned()),
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
        }];

        let result = diff_filter(&prev, &next);
        assert_eq!(
            result,
            vec![FlatReqFilter {
                id: Some("b".to_owned()),
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
            }]
        )
    }
}
