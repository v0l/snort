use std::collections::HashSet;
#[cfg(test)]
use std::fmt::Debug;
use std::hash::Hash;

use itertools::Itertools;
use serde::{Deserialize, Serialize};

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

/// A single-valued (flat) filter — every multi-valued `ReqFilter` field is
/// expanded to one value.  Derives `Eq + Hash` so `diff.rs` can put these
/// into a `HashSet` for O(1) lookup.
#[derive(PartialEq, Eq, Hash, PartialOrd, Clone, Serialize, Deserialize, Default)]
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
    /// Calculate the distance in terms of similarity for merging.
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

/// Expand a `ReqFilter` into a flat list of `FlatReqFilter` via cartesian product.
///
/// Instead of boxing field values through an enum + string tag (old approach), we
/// collect typed slices per field and index them directly via the product indices,
/// eliminating both heap allocation and string-equality dispatch inside the loop.
pub fn expand(f: &ReqFilter) -> Vec<FlatReqFilter> {
    // Collect optional slices for each multi-valued field.
    // HashSet does not implement Deref, so we use as_ref() + collect().
    let ids_v: Vec<&String> = f.ids.as_ref().map_or_else(Vec::new, |s| s.iter().collect());
    let authors_v: Vec<&String> = f
        .authors
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let kinds_v: Vec<i32> = f
        .kinds
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().copied().collect());
    let relays_v: Vec<&String> = f
        .relays
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let e_tags_v: Vec<&String> = f
        .e_tag
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let p_tags_v: Vec<&String> = f
        .p_tag
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let d_tags_v: Vec<&String> = f
        .d_tag
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let t_tags_v: Vec<&String> = f
        .t_tag
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let r_tags_v: Vec<&String> = f
        .r_tag
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let a_tags_v: Vec<&String> = f
        .a_tag
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let g_tags_v: Vec<&String> = f
        .g_tag
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let k_tags_v: Vec<&String> = f
        .k_tag
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());
    let i_tags_v: Vec<&String> = f
        .i_tag
        .as_ref()
        .map_or_else(Vec::new, |s| s.iter().collect());

    // Build lengths for non-empty dimensions only.
    let mut dim_lengths: Vec<usize> = Vec::with_capacity(13);
    if !ids_v.is_empty() {
        dim_lengths.push(ids_v.len());
    }
    if !authors_v.is_empty() {
        dim_lengths.push(authors_v.len());
    }
    if !kinds_v.is_empty() {
        dim_lengths.push(kinds_v.len());
    }
    if !relays_v.is_empty() {
        dim_lengths.push(relays_v.len());
    }
    if !e_tags_v.is_empty() {
        dim_lengths.push(e_tags_v.len());
    }
    if !p_tags_v.is_empty() {
        dim_lengths.push(p_tags_v.len());
    }
    if !d_tags_v.is_empty() {
        dim_lengths.push(d_tags_v.len());
    }
    if !t_tags_v.is_empty() {
        dim_lengths.push(t_tags_v.len());
    }
    if !r_tags_v.is_empty() {
        dim_lengths.push(r_tags_v.len());
    }
    if !a_tags_v.is_empty() {
        dim_lengths.push(a_tags_v.len());
    }
    if !g_tags_v.is_empty() {
        dim_lengths.push(g_tags_v.len());
    }
    if !k_tags_v.is_empty() {
        dim_lengths.push(k_tags_v.len());
    }
    if !i_tags_v.is_empty() {
        dim_lengths.push(i_tags_v.len());
    }

    if dim_lengths.is_empty() {
        return vec![FlatReqFilter {
            search: f.search.clone(),
            since: f.since,
            until: f.until,
            limit: f.limit,
            ..Default::default()
        }];
    }

    let capacity: usize = dim_lengths.iter().product();
    let mut ret: Vec<FlatReqFilter> = Vec::with_capacity(capacity);

    let ranges: Vec<Vec<usize>> = dim_lengths.iter().map(|&n| (0..n).collect()).collect();

    for combo in ranges.into_iter().multi_cartesian_product() {
        // ci tracks which dimension of the combo corresponds to each field.
        #[allow(unused_assignments)]
        let mut ci = 0usize;

        macro_rules! take_str {
            ($v:expr) => {{
                if $v.is_empty() {
                    None
                } else {
                    let idx = combo[ci];
                    ci += 1;
                    Some((*$v[idx]).clone())
                }
            }};
        }
        macro_rules! take_i32 {
            ($v:expr) => {{
                if $v.is_empty() {
                    None
                } else {
                    let idx = combo[ci];
                    ci += 1;
                    Some($v[idx])
                }
            }};
        }

        let flat = FlatReqFilter {
            id: take_str!(ids_v),
            author: take_str!(authors_v),
            kind: take_i32!(kinds_v),
            relay: take_str!(relays_v),
            e_tag: take_str!(e_tags_v),
            p_tag: take_str!(p_tags_v),
            d_tag: take_str!(d_tags_v),
            t_tag: take_str!(t_tags_v),
            r_tag: take_str!(r_tags_v),
            a_tag: take_str!(a_tags_v),
            g_tag: take_str!(g_tags_v),
            k_tag: take_str!(k_tags_v),
            i_tag: take_str!(i_tags_v),
            search: f.search.clone(),
            since: f.since,
            until: f.until,
            limit: f.limit,
        };
        let _ = ci; // suppress dead-assignment warning on final macro invocation
        ret.push(flat);
    }

    ret
}

/// Convenience `Into` impl so existing call sites using `(&filter).into()` continue to work.
impl From<&ReqFilter> for Vec<FlatReqFilter> {
    fn from(f: &ReqFilter) -> Vec<FlatReqFilter> {
        expand(f)
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
        match arr {
            Some(set) => {
                set.insert(ap.clone());
            }
            None => {
                *arr = Some(HashSet::from([ap.clone()]));
            }
        }
    }
}

#[inline(always)]
fn array_prop_append_vec<T: Clone + Eq + Hash>(
    val: &Option<HashSet<T>>,
    arr: &mut Option<HashSet<T>>,
) {
    if let Some(ap) = val {
        match arr {
            Some(set) => {
                set.extend(ap.iter().cloned());
            }
            None => {
                *arr = Some(ap.clone());
            }
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
        // 3 authors × 3 kinds × 2 ids × 1 p_tag = 18
        assert_eq!(output.len(), 18);

        // Spot-check a few expected entries exist
        assert!(output.iter().any(|f| f.author.as_deref() == Some("a")
            && f.kind == Some(1)
            && f.id.as_deref() == Some("x")
            && f.p_tag.as_deref() == Some("a")
            && f.since == Some(99)
            && f.limit == Some(10)));
    }
}
