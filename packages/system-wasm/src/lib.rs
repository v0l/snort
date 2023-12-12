extern crate console_error_panic_hook;

use argon2::{Argon2};
use secp256k1::{Message, Secp256k1, XOnlyPublicKey};
use serde::{Deserialize, Serialize};
use crate::filter::{FlatReqFilter, ReqFilter};
use wasm_bindgen::prelude::*;

pub mod diff;
pub mod filter;
pub mod merge;
pub mod pow;

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
    let expanded_prev: Vec<FlatReqFilter> = prev_parsed
        .iter()
        .flat_map(|v| {
            let vec: Vec<FlatReqFilter> = v.into();
            vec
        })
        .collect();
    let expanded_next: Vec<FlatReqFilter> = next_parsed
        .iter()
        .flat_map(|v| {
            let vec: Vec<FlatReqFilter> = v.into();
            vec
        })
        .collect();
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

#[wasm_bindgen]
pub fn argon2(password: JsValue, salt: JsValue) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    let password_parsed: String = serde_wasm_bindgen::from_value(password)?;
    let salt_parsed: String = serde_wasm_bindgen::from_value(salt)?;
    let mut key = [0u8; 32];
    Argon2::default().hash_password_into(password_parsed.as_bytes(), salt_parsed.as_bytes(), &mut key).expect("Failed to generate key");
    Ok(serde_wasm_bindgen::to_value(&hex::encode(key))?)
}

#[wasm_bindgen]
pub fn schnorr_verify(hash: JsValue, sig: JsValue, pub_key: JsValue) -> Result<bool, JsValue> {
    console_error_panic_hook::set_once();
    let msg_hex: String = serde_wasm_bindgen::from_value(hash)?;
    let sig_hex: String = serde_wasm_bindgen::from_value(sig)?;
    let pub_key_hex: String = serde_wasm_bindgen::from_value(pub_key)?;

    let secp = Secp256k1::new();
    let msg = Message::from_digest_slice(&hex::decode(msg_hex).unwrap()).unwrap();
    let key = XOnlyPublicKey::from_slice(&hex::decode(pub_key_hex).unwrap()).unwrap();
    let sig = secp256k1::schnorr::Signature::from_slice(&hex::decode(sig_hex).unwrap()).unwrap();
    Ok(secp.verify_schnorr(&sig, &msg, &key).is_ok())
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
                a_tag: None,
                g_tag: None,
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
                a_tag: None,
                g_tag: None,
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
                a_tag: None,
                g_tag: None,
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
                a_tag: None,
                g_tag: None,
                search: None,
                since: None,
                until: None,
                e_tag: None,
                limit: None,
            },
        ];

        let expanded: Vec<FlatReqFilter> = input
            .iter()
            .flat_map(|v| {
                let r: Vec<FlatReqFilter> = v.into();
                r
            })
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
