extern crate wasm_bindgen;

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

mod expand;
mod diff;

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
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

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
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