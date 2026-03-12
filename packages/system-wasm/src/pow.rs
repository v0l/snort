use std::fmt::Write as FmtWrite;

use crate::Event;

pub fn pow(ev: &mut Event, target: u8) {
    let mut ctr = 0u32;
    let nonce_tag_idx = match ev.tags.iter().position(|x| x[0] == "nonce") {
        Some(i) => i,
        None => {
            let idx = ev.tags.len();
            ev.tags.push(vec![
                "nonce".to_owned(),
                ctr.to_string(),
                target.to_string(),
            ]);
            idx
        }
    };

    // Reuse a single String buffer across iterations to avoid repeated heap allocation.
    let mut id_buf = String::with_capacity(512);
    loop {
        ev.tags[nonce_tag_idx][1] = ctr.to_string();

        make_id_into(ev, &mut id_buf);
        let digest = sha256::digest(id_buf.as_bytes());
        if count_leading_zeros(&digest) >= target {
            ev.id = Some(digest);
            break;
        }

        ctr += 1;
    }
}

/// Count the number of leading zero bits in a hex-encoded SHA-256 digest.
/// Decodes nibble-by-nibble from the `&str` without allocating a `Vec<u8>`.
fn count_leading_zeros(hex_str: &str) -> u8 {
    let mut count = 0u8;
    let bytes = hex_str.as_bytes();
    let mut i = 0;
    while i + 1 < bytes.len() {
        let byte = (hex_nibble(bytes[i]) << 4) | hex_nibble(bytes[i + 1]);
        if byte == 0 {
            count += 8;
        } else {
            count += byte.leading_zeros() as u8;
            break;
        }
        i += 2;
    }
    count
}

#[inline(always)]
fn hex_nibble(c: u8) -> u8 {
    match c {
        b'0'..=b'9' => c - b'0',
        b'a'..=b'f' => c - b'a' + 10,
        b'A'..=b'F' => c - b'A' + 10,
        _ => 0,
    }
}

/// Write the canonical Nostr event serialisation into `buf`, clearing it first.
/// Avoids allocating intermediate `Vec<String>` for the tags.
fn make_id_into(ev: &Event, buf: &mut String) {
    buf.clear();
    buf.push_str("[0,\"");
    buf.push_str(&ev.pubkey);
    buf.push_str("\",");
    let _ = write!(buf, "{}", ev.created_at);
    buf.push(',');
    let _ = write!(buf, "{}", ev.kind);
    buf.push_str(",[");
    for (ti, tag) in ev.tags.iter().enumerate() {
        if ti > 0 {
            buf.push(',');
        }
        buf.push('[');
        for (vi, val) in tag.iter().enumerate() {
            if vi > 0 {
                buf.push(',');
            }
            buf.push('"');
            for ch in val.chars() {
                match ch {
                    '"' => buf.push_str("\\\""),
                    '\\' => buf.push_str("\\\\"),
                    '\n' => buf.push_str("\\n"),
                    '\r' => buf.push_str("\\r"),
                    '\t' => buf.push_str("\\t"),
                    c => buf.push(c),
                }
            }
            buf.push('"');
        }
        buf.push(']');
    }
    buf.push_str("],\"");
    buf.push_str(&ev.content);
    buf.push_str("\"]");
}

/// Compute the canonical Nostr event ID (SHA-256 hex of the serialised commitment).
/// Public so `verify.rs` and benchmarks can reuse it directly.
pub fn make_id(ev: &Event) -> String {
    let mut buf = String::with_capacity(512);
    make_id_into(ev, &mut buf);
    sha256::digest(buf.as_bytes())
}

#[cfg(test)]
mod tests {
    use crate::Event;
    use serde::Deserialize;
    use serde_json::json;

    #[test]
    fn make_id() {
        let ev = Event::deserialize(json!({
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
        })).ok().unwrap();

        assert_eq!(super::make_id(&ev), ev.id.unwrap())
    }

    #[test]
    fn count_zeros() {
        assert_eq!(10u8.leading_zeros(), 4);
        assert_eq!(super::count_leading_zeros("00"), 8);
        assert_eq!(
            super::count_leading_zeros(
                "0000051bca8ee62220b34827358dca69284734a2e7420f3c4b814901a531c767"
            ),
            21
        )
    }
}
