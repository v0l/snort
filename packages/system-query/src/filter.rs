use serde::{Deserialize, Serialize};
use std::collections::HashSet;
#[cfg(test)]
use std::fmt::Debug;
use std::hash::Hash;

#[derive(PartialEq, Clone, Serialize, Deserialize)]
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
    #[serde(rename = "search", skip_serializing_if = "Option::is_none")]
    pub search: Option<HashSet<String>>,
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

#[derive(PartialEq, PartialOrd, Clone, Serialize, Deserialize)]
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
        ret += prop_dist(&self.e_tag, &b.e_tag);
        ret += prop_dist(&self.p_tag, &b.p_tag);
        ret += prop_dist(&self.d_tag, &b.d_tag);
        ret += prop_dist(&self.r_tag, &b.r_tag);
        ret += prop_dist(&self.t_tag, &b.t_tag);
        ret += prop_dist(&self.search, &b.search);

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
        value.iter().fold(ret, |mut acc, x| {
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
}

impl From<Vec<&ReqFilter>> for ReqFilter {
    fn from(value: Vec<&ReqFilter>) -> Self {
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
        value.iter().fold(ret, |mut acc, x| {
            array_prop_append_vec(&x.ids, &mut acc.ids);
            array_prop_append_vec(&x.authors, &mut acc.authors);
            array_prop_append_vec(&x.kinds, &mut acc.kinds);
            array_prop_append_vec(&x.e_tag, &mut acc.e_tag);
            array_prop_append_vec(&x.p_tag, &mut acc.p_tag);
            array_prop_append_vec(&x.t_tag, &mut acc.t_tag);
            array_prop_append_vec(&x.d_tag, &mut acc.d_tag);
            array_prop_append_vec(&x.r_tag, &mut acc.r_tag);
            array_prop_append_vec(&x.search, &mut acc.search);
            acc.since = x.since;
            acc.until = x.until;
            acc.limit = x.limit;

            acc
        })
    }
}

impl Distance for ReqFilter {
    fn distance(&self, b: &Self) -> u32 {
        let mut ret = 0u32;

        ret += prop_dist_vec(&self.ids, &b.ids);
        ret += prop_dist_vec(&self.kinds, &b.kinds);
        ret += prop_dist_vec(&self.authors, &b.authors);
        ret += prop_dist_vec(&self.e_tag, &b.e_tag);
        ret += prop_dist_vec(&self.p_tag, &b.p_tag);
        ret += prop_dist_vec(&self.d_tag, &b.d_tag);
        ret += prop_dist_vec(&self.r_tag, &b.r_tag);
        ret += prop_dist_vec(&self.t_tag, &b.t_tag);
        ret += prop_dist_vec(&self.search, &b.search);

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
