extern crate console_error_panic_hook;

use crate::filter::{FlatReqFilter, ReqFilter};
use secp256k1::{XOnlyPublicKey, SECP256K1};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

pub mod diff;
pub mod filter;
pub mod merge;
pub mod pow;
pub mod verify;

#[derive(PartialEq, Clone, Serialize, Deserialize)]
pub struct Event {
    #[serde(rename = "id", skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub kind: i32,
    pub created_at: u64,
    pub pubkey: String,
    pub content: String,
    #[serde(rename = "sig", skip_serializing_if = "Option::is_none")]
    pub sig: Option<String>,
    pub tags: Vec<Vec<String>>,
}

#[wasm_bindgen]
pub fn diff_filters(prev: JsValue, next: JsValue) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    let prev_parsed: Vec<FlatReqFilter> = serde_wasm_bindgen::from_value(prev)?;
    let next_parsed: Vec<FlatReqFilter> = serde_wasm_bindgen::from_value(next)?;
    let result = diff::diff_filter(&prev_parsed, &next_parsed);
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[wasm_bindgen]
pub fn expand_filter(val: JsValue) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    let parsed: ReqFilter = serde_wasm_bindgen::from_value(val)?;
    let result: Vec<FlatReqFilter> = (&parsed).into();
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[wasm_bindgen]
pub fn get_diff(prev: JsValue, next: JsValue) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    let prev_parsed: Vec<ReqFilter> = serde_wasm_bindgen::from_value(prev)?;
    let next_parsed: Vec<ReqFilter> = serde_wasm_bindgen::from_value(next)?;
    let expanded_prev: Vec<FlatReqFilter> =
        prev_parsed.iter().flat_map(|v| filter::expand(v)).collect();
    let expanded_next: Vec<FlatReqFilter> =
        next_parsed.iter().flat_map(|v| filter::expand(v)).collect();
    let result = diff::diff_filter(&expanded_prev, &expanded_next);
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[wasm_bindgen]
pub fn flat_merge(val: JsValue) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    let val_parsed: Vec<FlatReqFilter> = serde_wasm_bindgen::from_value(val)?;
    let result = merge::merge::<FlatReqFilter, ReqFilter>(val_parsed.iter().collect());
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[wasm_bindgen]
pub fn compress(val: JsValue) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    let val_parsed: Vec<ReqFilter> = serde_wasm_bindgen::from_value(val)?;
    let result = merge::merge::<ReqFilter, ReqFilter>(val_parsed.iter().collect());
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[wasm_bindgen]
pub fn pow(val: JsValue, target: JsValue) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    let mut val_parsed: Event = serde_wasm_bindgen::from_value(val)?;
    let target_parsed: u8 = serde_wasm_bindgen::from_value(target)?;
    pow::pow(&mut val_parsed, target_parsed);
    Ok(serde_wasm_bindgen::to_value(&val_parsed)?)
}

/// Verify a raw Schnorr signature given the message hash, signature, and
/// x-only public key — all as hex strings.
///
/// Returns a `JsValue` error (rather than panicking) if any hex value is
/// malformed or the wrong length.
#[wasm_bindgen]
pub fn schnorr_verify(hash: JsValue, sig: JsValue, pub_key: JsValue) -> Result<bool, JsValue> {
    console_error_panic_hook::set_once();
    let msg_hex: String = serde_wasm_bindgen::from_value(hash)?;
    let sig_hex: String = serde_wasm_bindgen::from_value(sig)?;
    let pub_key_hex: String = serde_wasm_bindgen::from_value(pub_key)?;

    let key_bytes = hex::decode(&pub_key_hex).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let sig_bytes = hex::decode(&sig_hex).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let msg_bytes = hex::decode(&msg_hex).map_err(|e| JsValue::from_str(&e.to_string()))?;

    let key =
        XOnlyPublicKey::from_slice(&key_bytes).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let sig = secp256k1::schnorr::Signature::from_slice(&sig_bytes)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(SECP256K1.verify_schnorr(&sig, &msg_bytes, &key).is_ok())
}

fn log_error(msg: &str, err: &str) {
    web_sys::console::error_2(&JsValue::from_str(msg), &JsValue::from_str(err));
}

/// Verify a single Nostr event.
///
/// Computes the canonical event ID from scratch (does not trust `event.id`)
/// then checks the Schnorr signature.  Returns `false` for any malformed
/// field rather than throwing — preserving existing call-site behaviour.
#[wasm_bindgen]
pub fn schnorr_verify_event(event: JsValue) -> Result<bool, JsValue> {
    console_error_panic_hook::set_once();
    let event_obj: Event = serde_wasm_bindgen::from_value(event)?;
    match verify::verify_event(&event_obj, false) {
        Ok(result) => Ok(result),
        Err(e) => {
            log_error("schnorr_verify_event failed", &format!("{:?}", e));
            Ok(false)
        }
    }
}

#[wasm_bindgen]
pub fn schnorr_verify_batch(events: JsValue) -> Result<Box<[u8]>, JsValue> {
    console_error_panic_hook::set_once();
    let events_parsed: Vec<Event> = serde_wasm_bindgen::from_value(events)?;
    let results: Vec<bool> = verify::verify_batch_with_errors(&events_parsed);
    Ok(results
        .into_iter()
        .map(|b| b as u8)
        .collect::<Vec<_>>()
        .into_boxed_slice())
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
                kinds: Some(HashSet::from([1, 6969, 6])),
                authors: Some(HashSet::from([
                    "kieran".to_string(),
                    "snort".to_string(),
                    "c".to_string(),
                    "d".to_string(),
                    "e".to_string(),
                ])),
                since: Some(1),
                until: Some(100),
                ..Default::default()
            },
            ReqFilter {
                kinds: Some(HashSet::from([4])),
                authors: Some(HashSet::from(["kieran".to_string()])),
                ..Default::default()
            },
            ReqFilter {
                kinds: Some(HashSet::from([4])),
                p_tag: Some(HashSet::from(["kieran".to_string()])),
                ..Default::default()
            },
            ReqFilter {
                kinds: Some(HashSet::from([1000])),
                authors: Some(HashSet::from(["snort".to_string()])),
                p_tag: Some(HashSet::from(["kieran".to_string()])),
                ..Default::default()
            },
        ];

        let expanded: Vec<FlatReqFilter> = input
            .iter()
            .flat_map(|v| filter::expand(v))
            .sorted_by(|_, _| {
                if rand::random() {
                    Ordering::Less
                } else {
                    Ordering::Greater
                }
            })
            .collect();
        let merged_expanded: Vec<ReqFilter> = merge::merge(expanded.iter().collect());
        assert_eq!(merged_expanded.len(), input.len());
        assert!(merged_expanded.iter().all(|v| input.contains(v)));
    }
}
