use std::collections::HashSet;
#[cfg(test)]
use std::fmt::Debug;
use std::hash::Hash;

use itertools::Itertools;
use serde::{Deserialize, Serialize};

#[derive(Clone)]
enum StringOrNumberEntry<'a> {
    String((&'static str, &'a String)),
    Number((&'static str, &'a i32)),
}

#[derive(PartialEq, Clone, Serialize, Deserialize, Default)]
pub struct ReqFilter {
    #[serde(rename = "ids", skip_serializing_if = "Option::is_none")]
    pub ids: Option<HashSet<String>>,
    #[serde(rename = "authors", skip_serializing_if = "Option::is_none")]
    pub authors: Option<HashSet<String>>,
    #[serde(rename = "kinds", skip_serializing_if = "Option::is_none")]
    pub kinds: Option<HashSet<i32>>,
    #[serde(rename = "#e", skip_serializing_if = "Option::is_none")]
    pub e_tag: Option<HashSet<String>>,
    #[serde(rename = "#p", skip_serializing_if = "Option::is_none")]
    pub p_tag: Option<HashSet<String>>,
    #[serde(rename = "#t", skip_serializing_if = "Option::is_none")]
    pub t_tag: Option<HashSet<String>>,
    #[serde(rename = "#d", skip_serializing_if = "Option::is_none")]
    pub d_tag: Option<HashSet<String>>,
    #[serde(rename = "#r", skip_serializing_if = "Option::is_none")]
    pub r_tag: Option<HashSet<String>>,
    #[serde(rename = "#a", skip_serializing_if = "Option::is_none")]
    pub a_tag: Option<HashSet<String>>,
    #[serde(rename = "#g", skip_serializing_if = "Option::is_none")]
    pub g_tag: Option<HashSet<String>>,
    #[serde(rename = "#k", skip_serializing_if = "Option::is_none")]
    pub k_tag: Option<HashSet<String>>,
    #[serde(rename = "#i", skip_serializing_if = "Option::is_none")]
    pub i_tag: Option<HashSet<String>>,
    #[serde(rename = "relays", skip_serializing_if = "Option::is_none")]
    pub relays: Option<HashSet<String>>,
    #[serde(rename = "search", skip_serializing_if = "Option::is_none")]
    pub search: Option<String>,
    #[serde(rename = "since", skip_serializing_if = "Option::is_none")]
    pub since: Option<i32>,
    #[serde(rename = "until", skip_serializing_if = "Option::is_none")]
    pub until: Option<i32>,
    #[serde(rename = "limit", skip_serializing_if = "Option::is_none")]
    pub limit: Option<i32>,
}

#[cfg(test)]
impl Debug for ReqFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&serde_json::to_string(self).unwrap().to_owned())
    }
}

#[derive(PartialEq, PartialOrd, Clone, Serialize, Deserialize, Default)]
pub struct FlatReqFilter {
    #[serde(rename = "ids", skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(rename = "authors", skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(rename = "kinds", skip_serializing_if = "Option::is_none")]
    pub kind: Option<i32>,
    #[serde(rename = "#e", skip_serializing_if = "Option::is_none")]
    pub e_tag: Option<String>,
    #[serde(rename = "#p", skip_serializing_if = "Option::is_none")]
    pub p_tag: Option<String>,
    #[serde(rename = "#t", skip_serializing_if = "Option::is_none")]
    pub t_tag: Option<String>,
    #[serde(rename = "#d", skip_serializing_if = "Option::is_none")]
    pub d_tag: Option<String>,
    #[serde(rename = "#r", skip_serializing_if = "Option::is_none")]
    pub r_tag: Option<String>,
    #[serde(rename = "#a", skip_serializing_if = "Option::is_none")]
    pub a_tag: Option<String>,
    #[serde(rename = "#g", skip_serializing_if = "Option::is_none")]
    pub g_tag: Option<String>,
    #[serde(rename = "#k", skip_serializing_if = "Option::is_none")]
    pub k_tag: Option<String>,
    #[serde(rename = "#i", skip_serializing_if = "Option::is_none")]
    pub i_tag: Option<String>,
    #[serde(rename = "search", skip_serializing_if = "Option::is_none")]
    pub search: Option<String>,
    #[serde(rename = "relay", skip_serializing_if = "Option::is_none")]
    pub relay: Option<String>,
    #[serde(rename = "since", skip_serializing_if = "Option::is_none")]
    pub since: Option<i32>,
    #[serde(rename = "until", skip_serializing_if = "Option::is_none")]
    pub until: Option<i32>,
    #[serde(rename = "limit", skip_serializing_if = "Option::is_none")]
    pub limit: Option<i32>,
}

#[cfg(test)]
impl Debug for FlatReqFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&serde_json::to_string(self).unwrap().to_owned())
    }
}

pub trait Distance {
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
    fn distance(&self, other: &Self) -> u32;
}

pub trait CanMerge {
    fn can_merge(&self, other: &Self) -> bool;
}

impl Distance for FlatReqFilter {
    fn distance(&self, b: &Self) -> u32 {
        let mut ret = 0u32;

        ret += prop_dist(&self.id, &b.id);
        ret += prop_dist(&self.kind, &b.kind);
        ret += prop_dist(&self.author, &b.author);
        ret += prop_dist(&self.relay, &b.relay);
        ret += prop_dist(&self.e_tag, &b.e_tag);
        ret += prop_dist(&self.p_tag, &b.p_tag);
        ret += prop_dist(&self.d_tag, &b.d_tag);
        ret += prop_dist(&self.r_tag, &b.r_tag);
        ret += prop_dist(&self.t_tag, &b.t_tag);
        ret += prop_dist(&self.g_tag, &b.g_tag);
        ret += prop_dist(&self.k_tag, &b.k_tag);
        ret += prop_dist(&self.i_tag, &b.i_tag);

        ret
    }
}

impl CanMerge for FlatReqFilter {
    fn can_merge(&self, other: &Self) -> bool {
        if self.since != other.since
            || self.until != other.until
            || self.limit != other.limit
            || self.search != other.search
        {
            return false;
        }

        self.distance(other) <= 1
    }
}

impl From<Vec<&FlatReqFilter>> for ReqFilter {
    fn from(value: Vec<&FlatReqFilter>) -> Self {
        let ret = Default::default();
        value.iter().fold(ret, |mut acc, x| {
            array_prop_append(&x.id, &mut acc.ids);
            array_prop_append(&x.author, &mut acc.authors);
            array_prop_append(&x.kind, &mut acc.kinds);
            array_prop_append(&x.relay, &mut acc.relays);
            array_prop_append(&x.e_tag, &mut acc.e_tag);
            array_prop_append(&x.p_tag, &mut acc.p_tag);
            array_prop_append(&x.t_tag, &mut acc.t_tag);
            array_prop_append(&x.d_tag, &mut acc.d_tag);
            array_prop_append(&x.r_tag, &mut acc.r_tag);
            array_prop_append(&x.a_tag, &mut acc.a_tag);
            array_prop_append(&x.g_tag, &mut acc.g_tag);
            array_prop_append(&x.k_tag, &mut acc.k_tag);
            array_prop_append(&x.i_tag, &mut acc.i_tag);
            acc.search = x.search.to_owned();
            acc.since = x.since;
            acc.until = x.until;
            acc.limit = x.limit;

            acc
        })
    }
}

impl From<Vec<&ReqFilter>> for ReqFilter {
    fn from(value: Vec<&ReqFilter>) -> Self {
        let ret = Default::default();
        value.iter().fold(ret, |mut acc, x| {
            array_prop_append_vec(&x.ids, &mut acc.ids);
            array_prop_append_vec(&x.authors, &mut acc.authors);
            array_prop_append_vec(&x.kinds, &mut acc.kinds);
            array_prop_append_vec(&x.relays, &mut acc.relays);
            array_prop_append_vec(&x.e_tag, &mut acc.e_tag);
            array_prop_append_vec(&x.p_tag, &mut acc.p_tag);
            array_prop_append_vec(&x.t_tag, &mut acc.t_tag);
            array_prop_append_vec(&x.d_tag, &mut acc.d_tag);
            array_prop_append_vec(&x.r_tag, &mut acc.r_tag);
            array_prop_append_vec(&x.a_tag, &mut acc.a_tag);
            array_prop_append_vec(&x.g_tag, &mut acc.g_tag);
            array_prop_append_vec(&x.k_tag, &mut acc.k_tag);
            array_prop_append_vec(&x.i_tag, &mut acc.i_tag);
            acc.search = x.search.to_owned();
            acc.since = x.since;
            acc.until = x.until;
            acc.limit = x.limit;

            acc
        })
    }
}

impl Into<Vec<FlatReqFilter>> for &ReqFilter {
    fn into(self) -> Vec<FlatReqFilter> {
        let mut ret: Vec<FlatReqFilter> = Vec::new();

        let mut inputs: Vec<Vec<StringOrNumberEntry>> = vec![];
        if let Some(ids) = &self.ids {
            let t_ids = ids
                .iter()
                .map(|z| StringOrNumberEntry::String(("id", z)))
                .collect();
            inputs.push(t_ids);
        }
        if let Some(authors) = &self.authors {
            let t_ids = authors
                .iter()
                .map(|z| StringOrNumberEntry::String(("author", z)))
                .collect();
            inputs.push(t_ids);
        }
        if let Some(kinds) = &self.kinds {
            let t_ids = kinds
                .iter()
                .map(|z| StringOrNumberEntry::Number(("kind", z)))
                .collect();
            inputs.push(t_ids);
        }
        if let Some(relays) = &self.relays {
            let t_relays = relays
                .iter()
                .map(|z| StringOrNumberEntry::String(("relay", z)))
                .collect();
            inputs.push(t_relays);
        }
        if let Some(e_tags) = &self.e_tag {
            let t_ids = e_tags
                .iter()
                .map(|z| StringOrNumberEntry::String(("e_tag", z)))
                .collect();
            inputs.push(t_ids);
        }
        if let Some(p_tags) = &self.p_tag {
            let t_ids = p_tags
                .iter()
                .map(|z| StringOrNumberEntry::String(("p_tag", z)))
                .collect();
            inputs.push(t_ids);
        }
        if let Some(d_tags) = &self.d_tag {
            let t_ids = d_tags
                .iter()
                .map(|z| StringOrNumberEntry::String(("d_tag", z)))
                .collect();
            inputs.push(t_ids);
        }
        if let Some(t_tags) = &self.t_tag {
            let t_ids = t_tags
                .iter()
                .map(|z| StringOrNumberEntry::String(("t_tag", z)))
                .collect();
            inputs.push(t_ids);
        }
        if let Some(r_tags) = &self.r_tag {
            let t_ids = r_tags
                .iter()
                .map(|z| StringOrNumberEntry::String(("r_tag", z)))
                .collect();
            inputs.push(t_ids);
        }
        if let Some(a_tags) = &self.a_tag {
            let t_ids = a_tags
                .iter()
                .map(|z| StringOrNumberEntry::String(("a_tag", z)))
                .collect();
            inputs.push(t_ids);
        }
        if let Some(g_tags) = &self.g_tag {
            let t_ids = g_tags
                .iter()
                .map(|z| StringOrNumberEntry::String(("g_tag", z)))
                .collect();
            inputs.push(t_ids);
        }

        if let Some(k_tags) = &self.k_tag {
            let t_ids = k_tags
                .iter()
                .map(|z| StringOrNumberEntry::String(("k_tag", z)))
                .collect();
            inputs.push(t_ids);
        }

        if let Some(i_tags) = &self.i_tag {
            let t_ids = i_tags
                .iter()
                .map(|z| StringOrNumberEntry::String(("i_tag", z)))
                .collect();
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
                relay: p.iter().find_map(|q| {
                    if let StringOrNumberEntry::String((k, v)) = q {
                        if (*k).eq("relay") {
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
                a_tag: p.iter().find_map(|q| {
                    if let StringOrNumberEntry::String((k, v)) = q {
                        if (*k).eq("a_tag") {
                            return Some((*v).to_string());
                        }
                    }
                    None
                }),
                g_tag: p.iter().find_map(|q| {
                    if let StringOrNumberEntry::String((k, v)) = q {
                        if (*k).eq("g_tag") {
                            return Some((*v).to_string());
                        }
                    }
                    None
                }),
                k_tag: p.iter().find_map(|q| {
                    if let StringOrNumberEntry::String((k, v)) = q {
                        if (*k).eq("k_tag") {
                            return Some((*v).to_string());
                        }
                    }
                    None
                }),
                i_tag: p.iter().find_map(|q| {
                    if let StringOrNumberEntry::String((k, v)) = q {
                        if (*k).eq("i_tag") {
                            return Some((*v).to_string());
                        }
                    }
                    None
                }),
                search: self.search.to_owned(),
                since: self.since,
                until: self.until,
                limit: self.limit,
            })
        }
        ret
    }
}

impl Distance for ReqFilter {
    fn distance(&self, b: &Self) -> u32 {
        let mut ret = 0u32;

        ret += prop_dist_vec(&self.ids, &b.ids);
        ret += prop_dist_vec(&self.kinds, &b.kinds);
        ret += prop_dist_vec(&self.authors, &b.authors);
        ret += prop_dist_vec(&self.relays, &b.relays);
        ret += prop_dist_vec(&self.e_tag, &b.e_tag);
        ret += prop_dist_vec(&self.p_tag, &b.p_tag);
        ret += prop_dist_vec(&self.d_tag, &b.d_tag);
        ret += prop_dist_vec(&self.r_tag, &b.r_tag);
        ret += prop_dist_vec(&self.t_tag, &b.t_tag);
        ret += prop_dist_vec(&self.a_tag, &b.a_tag);
        ret += prop_dist_vec(&self.g_tag, &b.g_tag);
        ret += prop_dist_vec(&self.k_tag, &b.k_tag);
        ret += prop_dist_vec(&self.i_tag, &b.i_tag);

        ret
    }
}

impl CanMerge for ReqFilter {
    fn can_merge(&self, other: &Self) -> bool {
        if self.since != other.since
            || self.until != other.until
            || self.limit != other.limit
            || self.search != other.search
        {
            return false;
        }

        self.distance(other) <= 1
    }
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
fn prop_dist_vec<T: Eq + Hash>(a: &Option<HashSet<T>>, b: &Option<HashSet<T>>) -> u32 {
    if (a.is_some() && b.is_none()) || (a.is_none() && b.is_some()) {
        return 10;
    }
    match (a, b) {
        (Some(aa), Some(bb)) => {
            if aa.len() != bb.len() {
                1
            } else if aa == bb {
                0
            } else {
                1
            }
        }
        (None, None) => 0,
        _ => panic!("Should not reach here!"),
    }
}

#[inline(always)]
fn array_prop_append<T: Clone + Eq + Hash>(val: &Option<T>, arr: &mut Option<HashSet<T>>) {
    if let Some(ap) = val {
        if arr.is_none() {
            *arr = Some(HashSet::from([ap.clone()]))
        } else {
            arr.as_mut().unwrap().insert(ap.clone());
        }
    }
}

#[inline(always)]
fn array_prop_append_vec<T: Clone + Eq + Hash>(
    val: &Option<HashSet<T>>,
    arr: &mut Option<HashSet<T>>,
) {
    if let Some(ap) = val {
        if arr.is_none() {
            *arr = Some(ap.clone())
        } else {
            ap.iter().for_each(|v| {
                arr.as_mut().unwrap().insert((*v).clone());
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use crate::filter::FlatReqFilter;
    use crate::ReqFilter;

    #[test]
    fn test_expand_filter() {
        let input = ReqFilter {
            authors: Some(HashSet::from([
                "a".to_owned(),
                "b".to_owned(),
                "c".to_owned(),
            ])),
            kinds: Some(HashSet::from([1, 2, 3])),
            ids: Some(HashSet::from(["x".to_owned(), "y".to_owned()])),
            p_tag: Some(HashSet::from(["a".to_owned()])),
            since: Some(99),
            limit: Some(10),
            ..Default::default()
        };

        let output: Vec<FlatReqFilter> = (&input).into();
        let expected = vec![
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(1),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(1),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(2),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(2),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(3),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("a".to_owned()),
                kind: Some(3),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(1),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(1),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(2),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(2),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(3),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("b".to_owned()),
                kind: Some(3),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(1),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(1),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(2),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(2),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(3),
                id: Some("x".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
            FlatReqFilter {
                author: Some("c".to_owned()),
                kind: Some(3),
                id: Some("y".to_owned()),
                p_tag: Some("a".to_owned()),
                since: Some(99),
                limit: Some(10),
                ..Default::default()
            },
        ];
        assert_eq!(output.len(), expected.len());
        output.iter().for_each(|a| assert!(expected.contains(a)));
    }
}
