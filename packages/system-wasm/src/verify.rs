//! Schnorr signature verification for Nostr events.
//!
//! Centralises the logic used by both `schnorr_verify_event` (single) and
//! `schnorr_verify_batch` (N events in one call) so the two code paths share
//! the same parsing and error handling.

use secp256k1::{schnorr::Signature, XOnlyPublicKey, SECP256K1};

use crate::{pow, Event};

/// Errors that can occur during event verification.
#[derive(Debug)]
pub enum VerifyError {
    /// `sig` field is missing from the event.
    MissingSig,
    /// A hex field has the wrong byte length.
    BadLength {
        field: &'static str,
        got: usize,
        expected: usize,
    },
    /// Hex decoding failed.
    HexDecode(&'static str),
    /// secp256k1 rejected the public key bytes.
    BadPubkey,
    /// secp256k1 rejected the signature bytes.
    BadSig,
}

impl From<VerifyError> for wasm_bindgen::JsValue {
    fn from(e: VerifyError) -> Self {
        wasm_bindgen::JsValue::from_str(&format!("{:?}", e))
    }
}

/// Decode a fixed-length hex string into a byte array without allocating a Vec.
#[inline]
fn decode_hex_fixed<const N: usize>(s: &str, field: &'static str) -> Result<[u8; N], VerifyError> {
    // A hex string for N bytes must be exactly 2*N characters.
    if s.len() != N * 2 {
        return Err(VerifyError::BadLength {
            field,
            got: s.len(),
            expected: N * 2,
        });
    }
    let mut out = [0u8; N];
    hex::decode_to_slice(s, &mut out).map_err(|_| VerifyError::HexDecode(field))?;
    Ok(out)
}

/// Verify a single Nostr event.
///
/// If `trust_id` is true and `event.id` is `Some`, the provided ID is decoded
/// and used directly as the message hash rather than recomputing it.  This
/// saves a full SHA-256 + JSON serialisation when the caller has already
/// validated the ID separately (e.g. events retrieved from a local DB that
/// stores only verified events).
///
/// Returns `Ok(true)` if valid, `Ok(false)` if the signature is wrong,
/// `Err(...)` if the event is malformed.
pub fn verify_event(event: &Event, trust_id: bool) -> Result<bool, VerifyError> {
    // --- fast pre-validation: check hex lengths before touching secp256k1 ---
    let pubkey_bytes: [u8; 32] = decode_hex_fixed(&event.pubkey, "pubkey")?;

    let sig_str = event.sig.as_deref().ok_or(VerifyError::MissingSig)?;
    let sig_bytes: [u8; 64] = decode_hex_fixed(sig_str, "sig")?;

    // Compute (or reuse) the event ID.
    let id_bytes: [u8; 32] = if trust_id {
        if let Some(id) = event.id.as_deref() {
            decode_hex_fixed(id, "id")?
        } else {
            // No ID provided — must compute it.
            let id_hex = pow::make_id(event);
            decode_hex_fixed(&id_hex, "id")?
        }
    } else {
        // Always recompute — canonical verification.
        let id_hex = pow::make_id(event);
        decode_hex_fixed(&id_hex, "id")?
    };

    // --- secp256k1 ---
    let key = XOnlyPublicKey::from_slice(&pubkey_bytes).map_err(|_| VerifyError::BadPubkey)?;
    let sig = Signature::from_slice(&sig_bytes).map_err(|_| VerifyError::BadSig)?;

    Ok(SECP256K1.verify_schnorr(&sig, &id_bytes, &key).is_ok())
}

/// Result of a batch verification: one entry per input event.
///
/// `true`  — valid signature and ID.
/// `false` — invalid signature / malformed event.
pub fn verify_batch(events: &[Event]) -> Vec<bool> {
    events
        .iter()
        .map(|ev| verify_event(ev, false).unwrap_or(false))
        .collect()
}

/// Verify a batch of events, logging detailed errors for each failure.
/// Returns a Vec<bool> where true means valid, false means invalid/error.
pub fn verify_batch_with_errors(events: &[Event]) -> Vec<bool> {
    events
        .iter()
        .enumerate()
        .map(|(idx, ev)| match verify_event(ev, false) {
            Ok(true) => true,
            Ok(false) => {
                eprintln!("batch[{}]: signature verification failed", idx);
                false
            }
            Err(e) => {
                eprintln!("batch[{}]: verification error: {:?}", idx, e);
                false
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;
    use serde_json::json;

    fn make_valid_event() -> Event {
        Event::deserialize(json!({
          "content": "Oh i think it doesnt work until you reload",
          "created_at": 1695568849,
          "id": "0000051bca8ee62220b34827358dca69284734a2e7420f3c4b814901a531c767",
          "kind": 1,
          "pubkey": "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed",
          "sig": "0c18bfcde49fd42c7faf93b3ecd7caf10f0414c9ee3234fca96ea0bbb1a805cb2767fc067dc1a743420c499b34c232e19b73beb2f1fe47c18a2856c67bdef983",
          "tags": [
            ["e","ad17146f086345a12583b537daabdf49ccc5cd09e2c0b4816c835f397b693e6b","wss://nos.lol/","root"],
            ["e","72759bf1f525e9715f4e6d22381f53dc4d2ab47d7aaac11340e7fced13e10b11","wss://nos.lol/","reply"],
            ["p","63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed"],
            ["p","1bc70a0148b3f316da33fe3c89f23e3e71ac4ff998027ec712b905cd24f6a411"],
            ["nonce","7403","18"]
          ]
        })).unwrap()
    }

    #[test]
    fn verify_valid_event() {
        let ev = make_valid_event();
        assert_eq!(verify_event(&ev, false).unwrap(), true);
    }

    #[test]
    fn verify_valid_event_trust_id() {
        let ev = make_valid_event();
        // With trust_id=true the ID is decoded directly — should still verify.
        assert_eq!(verify_event(&ev, true).unwrap(), true);
    }

    #[test]
    fn verify_bad_sig() {
        let mut ev = make_valid_event();
        // Flip the last byte of the signature.
        let mut sig = ev.sig.clone().unwrap();
        let last = sig.pop().unwrap();
        sig.push(if last == 'a' { 'b' } else { 'a' });
        ev.sig = Some(sig);
        // secp256k1 may reject the bytes entirely (BadSig) or return false.
        let result = verify_event(&ev, false);
        assert!(matches!(result, Ok(false) | Err(VerifyError::BadSig)));
    }

    #[test]
    fn verify_bad_pubkey_length() {
        let mut ev = make_valid_event();
        ev.pubkey = "deadbeef".to_string(); // too short
        assert!(matches!(
            verify_event(&ev, false),
            Err(VerifyError::BadLength {
                field: "pubkey",
                ..
            })
        ));
    }

    #[test]
    fn verify_missing_sig() {
        let mut ev = make_valid_event();
        ev.sig = None;
        assert!(matches!(
            verify_event(&ev, false),
            Err(VerifyError::MissingSig)
        ));
    }

    #[test]
    fn batch_verify_mixed() {
        let valid = make_valid_event();
        let mut invalid = make_valid_event();
        invalid.sig = None;

        let results = verify_batch(&[valid.clone(), invalid, valid]);
        assert_eq!(results, vec![true, false, true]);
    }

    #[test]
    fn batch_verify_empty() {
        assert_eq!(verify_batch(&[]), Vec::<bool>::new());
    }

    #[test]
    fn batch_verify_events_with_special_content() {
        let profile_with_newlines = Event::deserialize(json!({
          "content": "{\"about\":\"mar - the main character, might be a girl\\n\\ncatoshi - the black cat, definitely a cat\",\"banner\":\"https://mar101xy.com/images/mar101xy-profile-cover.jpg\",\"bot\":false,\"display_name\":\"mar\",\"lud16\":\"mar101xy@walletofsatoshi.com\",\"nip05\":\"mar@mar101xy.com\",\"picture\":\"https://mar101xy.com/images/avatar.jpg\",\"displayName\":\"mar\",\"fields\":[[\"test\",\"testing ditto\"],[\"gender\",\"testing gender\"]],\"name\":\"mar\"}",
          "created_at": 1775155758,
          "id": "053516868fe8f94fa180835d3b0be4042aaaddc514c6e6d6d8e0fa9694d3442d",
          "kind": 0,
          "pubkey": "c7acabf1fed201a53185e4dc5e0c6bae2bc5db19d73abf840535f305d8f05180",
          "sig": "c8de210d80a2ad92e1145e9c52177ab077f862acd9857f7e8b6ae24645893b0d81bf585814ececb17b0ecd17529135b39cdd9aaf2a84626509c11c6f0c6ed62f",
          "tags": [["client","Ditto"]]
        })).unwrap();

        let profile_with_escaped_backslash = Event::deserialize(json!({
          "content": "{\"name\":\"TheGrinder\",\"about\":\"Sovereign, creator of bitcoins, future owner of Mars and grinder of many things...\\n0863F34D0311FC550226F06A376B54D5650980FB\",\"picture\":\"https://i.nostr.build/TghNVYXqMe7knx7P.jpg\",\"banner\":\"https://nostr.build/i/094828ef504cb05424a9680db23d37db3cf02f05ede1d33528c5c5f9872db66e.jpg\",\"displayName\":\"TheGrinder\",\"lud16\":\"thegrinder@rizful.com\",\"display_name\":\"TheGrinder\",\"website\":\"https://zap.stream/thegrinder\",\"nip05\":\"thegrinder@nostrplebs.com\"}",
          "created_at": 1774868231,
          "id": "2dc93fea65b858e864520687927bb8e83374fff8eeb592c9cfaa8b470fc7b2db",
          "kind": 0,
          "pubkey": "6e75f7972397ca3295e0f4ca0fbc6eb9cc79be85bafdd56bd378220ca8eee74e",
          "sig": "4b2c21ff288b2e4e900f88429a0b4a8c3d6c248cab175b8e984d3251cf67578626583379cef99c73e85df3fc35407f292499df7124c3d854bfbf6ac0421a03ee",
          "tags": [["client","noStrudel","31990:266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5:1686066542546"]]
        })).unwrap();

        let plain = make_valid_event();

        let results = verify_batch(&[profile_with_newlines, profile_with_escaped_backslash, plain]);
        assert_eq!(results, vec![true, true, true]);
    }

    #[test]
    fn batch_verify_user_event() {
        let ev = Event::deserialize(json!({
          "kind": 1,
          "id": "c55e31fe1c93705558d58c8ad309b0b27c2f21dae92f72bfbc8869de872a2616",
          "pubkey": "06639a386c9c1014217622ccbcf40908c4f1a0c33e23f8d6d68f4abf655f8f71",
          "created_at": 1774961298,
          "tags": [
            ["e", "507c11d1cdb2130c751ff05e7afa0a47079025ba39ef099ae1a25c53c03ae99e", "wss://pyramid.fiatjaf.com/", "root", "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed"],
            ["e", "0468572f697fa7e399f7a99b0d7f1d640a10ceeab17d31e68e11af37be444b26", "wss://nos.lol/", "reply", "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed"],
            ["p", "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed"]
          ],
          "content": "I'm interested to try it.\nLocally I have qwen3.5 8B running with ollama on a RK1 32GB compute module.",
          "sig": "c07c9757ebb3e0808077d5876d5c670c0e788d9f92326ff21aae4766e026e722d017c2e9c1229eece8861c308732d920f1bdbb30ceddd4342d2c4c95f4c5fa05"
        })).unwrap();

        let computed_id = crate::pow::make_id(&ev);
        println!("computed_id: {}", computed_id);
        println!("event id: {:?}", ev.id);

        let results = verify_batch(&[ev]);
        println!("verify result: {:?}", results);
        assert_eq!(results, vec![true]);
    }
}
