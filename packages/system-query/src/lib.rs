use crate::filter::{FlatReqFilter, ReqFilter};
use wasm_bindgen::prelude::*;

mod diff;
mod expand;
mod filter;
mod merge;

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
    let result = merge::merge::<FlatReqFilter, ReqFilter>(val_parsed.iter().collect());
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use itertools::Itertools;
    use std::cmp::Ordering;
    use std::collections::HashSet;

    #[test]
    fn flat_merge_expanded() {
        let input = vec![
            ReqFilter {
                ids: None,
                kinds: Some(HashSet::from([1, 6969, 6])),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                authors: Some(HashSet::from([
                    "kieran".to_string(),
                    "snort".to_string(),
                    "c".to_string(),
                    "d".to_string(),
                    "e".to_string(),
                ])),
                since: Some(1),
                until: Some(100),
                search: None,
                limit: None,
            },
            ReqFilter {
                ids: None,
                kinds: Some(HashSet::from([4])),
                e_tag: None,
                p_tag: None,
                t_tag: None,
                d_tag: None,
                r_tag: None,
                search: None,
                since: None,
                until: None,
                authors: Some(HashSet::from(["kieran".to_string()])),
                limit: None,
            },
            ReqFilter {
                ids: None,
                authors: None,
                kinds: Some(HashSet::from([4])),
                e_tag: None,
                p_tag: Some(HashSet::from(["kieran".to_string()])),
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
                kinds: Some(HashSet::from([1000])),
                authors: Some(HashSet::from(["snort".to_string()])),
                p_tag: Some(HashSet::from(["kieran".to_string()])),
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
        let merged_expanded: Vec<ReqFilter> = merge::merge(expanded.iter().collect());
        assert_eq!(merged_expanded.len(), input.len());
        assert!(merged_expanded.iter().all(|v| input.contains(v)));
    }
}
