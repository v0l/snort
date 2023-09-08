use std::fmt::{Debug};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

mod diff;
mod expand;
mod merge;

#[derive(PartialEq, Clone, Serialize, Deserialize)]
pub struct ReqFilter {
    #[serde(rename = "ids", skip_serializing_if = "Option::is_none")]
    pub ids: Option<Vec<String>>,
    #[serde(rename = "authors", skip_serializing_if = "Option::is_none")]
    pub authors: Option<Vec<String>>,
    #[serde(rename = "kinds", skip_serializing_if = "Option::is_none")]
    pub kinds: Option<Vec<i32>>,
    #[serde(rename = "#e", skip_serializing_if = "Option::is_none")]
    pub e_tag: Option<Vec<String>>,
    #[serde(rename = "#p", skip_serializing_if = "Option::is_none")]
    pub p_tag: Option<Vec<String>>,
    #[serde(rename = "#t", skip_serializing_if = "Option::is_none")]
    pub t_tag: Option<Vec<String>>,
    #[serde(rename = "#d", skip_serializing_if = "Option::is_none")]
    pub d_tag: Option<Vec<String>>,
    #[serde(rename = "#r", skip_serializing_if = "Option::is_none")]
    pub r_tag: Option<Vec<String>>,
    #[serde(rename = "search", skip_serializing_if = "Option::is_none")]
    pub search: Option<Vec<String>>,
    #[serde(rename = "since", skip_serializing_if = "Option::is_none")]
    pub since: Option<i32>,
    #[serde(rename = "until", skip_serializing_if = "Option::is_none")]
    pub until: Option<i32>,
    #[serde(rename = "limit", skip_serializing_if = "Option::is_none")]
    pub limit: Option<i32>,
}

impl Debug for ReqFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&serde_json::to_string(self).unwrap().to_owned())
    }
}

#[derive(PartialEq, Clone, Serialize, Deserialize)]
pub struct FlatReqFilter {
    #[serde(rename = "ids", skip_serializing_if = "Option::is_none")]
    id: Option<String>,
    #[serde(rename = "authors", skip_serializing_if = "Option::is_none")]
    author: Option<String>,
    #[serde(rename = "kinds", skip_serializing_if = "Option::is_none")]
    kind: Option<i32>,
    #[serde(rename = "#e", skip_serializing_if = "Option::is_none")]
    e_tag: Option<String>,
    #[serde(rename = "#p", skip_serializing_if = "Option::is_none")]
    p_tag: Option<String>,
    #[serde(rename = "#t", skip_serializing_if = "Option::is_none")]
    t_tag: Option<String>,
    #[serde(rename = "#d", skip_serializing_if = "Option::is_none")]
    d_tag: Option<String>,
    #[serde(rename = "#r", skip_serializing_if = "Option::is_none")]
    r_tag: Option<String>,
    #[serde(rename = "search", skip_serializing_if = "Option::is_none")]
    search: Option<String>,
    #[serde(rename = "since", skip_serializing_if = "Option::is_none")]
    since: Option<i32>,
    #[serde(rename = "until", skip_serializing_if = "Option::is_none")]
    until: Option<i32>,
    #[serde(rename = "limit", skip_serializing_if = "Option::is_none")]
    limit: Option<i32>,
}

impl Debug for FlatReqFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&serde_json::to_string(self).unwrap().to_owned())
    }
}

#[wasm_bindgen]
pub fn diff_filters(prev: JsValue, next: JsValue) -> Result<JsValue, JsValue> {
    let prev_parsed: Vec<FlatReqFilter> = serde_wasm_bindgen::from_value(prev)?;
    let next_parsed: Vec<FlatReqFilter> = serde_wasm_bindgen::from_value(next)?;
    let result = diff::diff_filter(&prev_parsed, &next_parsed);
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[wasm_bindgen]
pub fn expand_filter(val: JsValue) -> Result<JsValue, JsValue> {
    let parsed: ReqFilter = serde_wasm_bindgen::from_value(val)?;
    let result = expand::expand_filter(&parsed);
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[wasm_bindgen]
pub fn get_diff(prev: JsValue, next: JsValue) -> Result<JsValue, JsValue> {
    let prev_parsed: Vec<ReqFilter> = serde_wasm_bindgen::from_value(prev)?;
    let next_parsed: Vec<ReqFilter> = serde_wasm_bindgen::from_value(next)?;
    let expanded_prev: Vec<FlatReqFilter> = prev_parsed
        .iter()
        .flat_map(|v| expand::expand_filter(v))
        .collect();
    let expanded_next: Vec<FlatReqFilter> = next_parsed
        .iter()
        .flat_map(|v| expand::expand_filter(v))
        .collect();
    let result = diff::diff_filter(&expanded_prev, &expanded_next);
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[wasm_bindgen]
pub fn flat_merge(val: JsValue) -> Result<JsValue, JsValue> {
    let val_parsed: Vec<FlatReqFilter> = serde_wasm_bindgen::from_value(val)?;
    let result = merge::flat_merge(&val_parsed);
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use itertools::Itertools;
    use std::cmp::Ordering;

    #[test]
    fn flat_merge_expanded() {
        let input = vec![
            ReqFilter {
                ids: None,
                kinds: Some(vec![1, 6969, 6]),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                authors: Some(vec![
                    "kieran".to_string(),
                    "snort".to_string(),
                    "c".to_string(),
                    "d".to_string(),
                    "e".to_string(),
                ]),
                since: Some(1),
                until: Some(100),
                search: None,
                limit: None,
            },
            ReqFilter {
                ids: None,
                kinds: Some(vec![4]),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                authors: Some(vec!["kieran".to_string()]),
                limit: None,
            },
            ReqFilter {
                ids: None,
                authors: None,
                kinds: Some(vec![4]),
                e_tag: None,
                p_tag: Some(vec!["kieran".to_string()]),
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
                kinds: Some(vec![1000]),
                authors: Some(vec!["snort".to_string()]),
                p_tag: Some(vec!["kieran".to_string()]),
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                e_tag: None,
                limit: None,
            },
        ];

        let expanded = input
            .iter()
            .flat_map(|v| expand::expand_filter(v))
            .sorted_by(|_, _| {
                if rand::random() {
                    Ordering::Less
                } else {
                    Ordering::Greater
                }
            })
            .collect_vec();
        let expanded_flat = merge::flat_merge(&expanded);
        assert_eq!(expanded_flat, input);
    }
}
