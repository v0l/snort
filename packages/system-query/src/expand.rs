use crate::{FlatReqFilter, ReqFilter};
use itertools::Itertools;

#[derive(Clone)]
enum StringOrNumberEntry<'a> {
    String((&'static str, &'a String)),
    Number((&'static str, &'a i32)),
}

pub fn expand_filter(filter: &ReqFilter) -> Vec<FlatReqFilter> {
    let mut ret: Vec<FlatReqFilter> = Vec::new();

    let mut inputs: Vec<Vec<StringOrNumberEntry>> = vec![];
    if let Some(ids) = &filter.ids {
        let t_ids = ids
            .iter()
            .map(|z| StringOrNumberEntry::String(("id", z)))
            .collect_vec();
        inputs.push(t_ids);
    }
    if let Some(authors) = &filter.authors {
        let t_ids = authors
            .iter()
            .map(|z| StringOrNumberEntry::String(("author", z)))
            .collect_vec();
        inputs.push(t_ids);
    }
    if let Some(kinds) = &filter.kinds {
        let t_ids = kinds
            .iter()
            .map(|z| StringOrNumberEntry::Number(("kind", z)))
            .collect_vec();
        inputs.push(t_ids);
    }
    if let Some(e_tags) = &filter.e_tag {
        let t_ids = e_tags
            .iter()
            .map(|z| StringOrNumberEntry::String(("e_tag", z)))
            .collect_vec();
        inputs.push(t_ids);
    }
    if let Some(p_tags) = &filter.p_tag {
        let t_ids = p_tags
            .iter()
            .map(|z| StringOrNumberEntry::String(("p_tag", z)))
            .collect_vec();
        inputs.push(t_ids);
    }
    if let Some(d_tags) = &filter.d_tag {
        let t_ids = d_tags
            .iter()
            .map(|z| StringOrNumberEntry::String(("d_tag", z)))
            .collect_vec();
        inputs.push(t_ids);
    }
    if let Some(t_tags) = &filter.t_tag {
        let t_ids = t_tags
            .iter()
            .map(|z| StringOrNumberEntry::String(("t_tag", z)))
            .collect_vec();
        inputs.push(t_ids);
    }
    if let Some(r_tags) = &filter.r_tag {
        let t_ids = r_tags
            .iter()
            .map(|z| StringOrNumberEntry::String(("r_tag", z)))
            .collect_vec();
        inputs.push(t_ids);
    }
    if let Some(search) = &filter.search {
        let t_ids = search
            .iter()
            .map(|z| StringOrNumberEntry::String(("search", z)))
            .collect_vec();
        inputs.push(t_ids);
    }

    for p in inputs.iter().multi_cartesian_product() {
        ret.push(FlatReqFilter {
            id: p.iter().find_map(|q| {
                if let StringOrNumberEntry::String((k, v)) = q {
                    if (*k).eq("id") {
                        return Some((*v).to_string());
                    }
                }
                None
            }),
            author: p.iter().find_map(|q| {
                if let StringOrNumberEntry::String((k, v)) = q {
                    if (*k).eq("author") {
                        return Some((*v).to_string());
                    }
                }
                None
            }),
            kind: p.iter().find_map(|q| {
                if let StringOrNumberEntry::Number((k, v)) = q {
                    if (*k).eq("kind") {
                        return Some((*v).clone());
                    }
                }
                None
            }),
            e_tag: p.iter().find_map(|q| {
                if let StringOrNumberEntry::String((k, v)) = q {
                    if (*k).eq("e_tag") {
                        return Some((*v).to_string());
                    }
                }
                None
            }),
            p_tag: p.iter().find_map(|q| {
                if let StringOrNumberEntry::String((k, v)) = q {
                    if (*k).eq("p_tag") {
                        return Some((*v).to_string());
                    }
                }
                None
            }),
            t_tag: p.iter().find_map(|q| {
                if let StringOrNumberEntry::String((k, v)) = q {
                    if (*k).eq("t_tag") {
                        return Some((*v).to_string());
                    }
                }
                None
            }),
            d_tag: p.iter().find_map(|q| {
                if let StringOrNumberEntry::String((k, v)) = q {
                    if (*k).eq("d_tag") {
                        return Some((*v).to_string());
                    }
                }
                None
            }),
            r_tag: p.iter().find_map(|q| {
                if let StringOrNumberEntry::String((k, v)) = q {
                    if (*k).eq("r_tag") {
                        return Some((*v).to_string());
                    }
                }
                None
            }),
            search: p.iter().find_map(|q| {
                if let StringOrNumberEntry::String((k, v)) = q {
                    if (*k).eq("search") {
                        return Some((*v).to_string());
                    }
                }
                None
            }),
            since: filter.since,
            until: filter.until,
            limit: filter.limit,
        })
    }
    ret
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ReqFilter;

    #[test]
    fn test_expand_filter() {
        let input = ReqFilter {
            authors: Some(vec!["a".to_owned(), "b".to_owned(), "c".to_owned()]),
            kinds: Some(vec![1, 2, 3]),
            ids: Some(vec!["x".to_owned(), "y".to_owned()]),
            p_tag: Some(vec!["a".to_owned()]),
            t_tag: None,
            d_tag: None,
            r_tag: None,
            search: None,
            since: Some(99),
            until: None,
            limit: Some(10),
            e_tag: None,
        };

        let output = expand_filter(&input);
        output.iter().take(5).for_each(|x| println!("{:?}", x));
        let expected = vec![
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(1),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(1),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(2),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(2),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(3),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(3),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(1),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(1),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(2),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(2),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(3),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(3),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(1),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(1),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(2),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(2),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(3),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(3),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: Some(99),
                until: None,
                limit: Some(10),
                e_tag: None,
            },
        ];
        assert_eq!(output.len(), expected.len());
        output.iter().for_each(|a| assert!(expected.contains(a)));
    }
}
