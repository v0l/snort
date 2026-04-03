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

    loop {
        ev.tags[nonce_tag_idx][1] = ctr.to_string();

        let id_hex = make_id(ev);
        let digest = sha256::digest(id_hex.as_bytes());
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

/// Write the canonical Nostr event serialisation using serde_json for correct escaping.
pub fn make_id(ev: &Event) -> String {
    let payload = serde_json::json!([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content]);
    sha256::digest(payload.to_string().as_bytes())
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
    fn make_id_with_special_chars_in_content() {
        let ev = Event::deserialize(json!({
          "content": "{\"about\":\"mar - the main character, might be a girl\\n\\ncatoshi - the black cat, definitely a cat\",\"banner\":\"https://mar101xy.com/images/mar101xy-profile-cover.jpg\",\"bot\":false,\"display_name\":\"mar\",\"lud16\":\"mar101xy@walletofsatoshi.com\",\"nip05\":\"mar@mar101xy.com\",\"picture\":\"https://mar101xy.com/images/avatar.jpg\",\"displayName\":\"mar\",\"fields\":[[\"test\",\"testing ditto\"],[\"gender\",\"testing gender\"]],\"name\":\"mar\"}",
          "created_at": 1775155758,
          "id": "053516868fe8f94fa180835d3b0be4042aaaddc514c6e6d6d8e0fa9694d3442d",
          "kind": 0,
          "pubkey": "c7acabf1fed201a53185e4dc5e0c6bae2bc5db19d73abf840535f305d8f05180",
          "sig": "c8de210d80a2ad92e1145e9c52177ab077f862acd9857f7e8b6ae24645893b0d81bf585814ececb17b0ecd17529135b39cdd9aaf2a84626509c11c6f0c6ed62f",
          "tags": [["client","Ditto"]]
        })).ok().unwrap();

        assert_eq!(super::make_id(&ev), ev.id.unwrap())
    }

    #[test]
    fn make_id_with_escaped_backslash_in_content() {
        let ev = Event::deserialize(json!({
          "content": "{\"name\":\"TheGrinder\",\"about\":\"Sovereign, creator of bitcoins, future owner of Mars and grinder of many things...\\n0863F34D0311FC550226F06A376B54D5650980FB\",\"picture\":\"https://i.nostr.build/TghNVYXqMe7knx7P.jpg\",\"banner\":\"https://nostr.build/i/094828ef504cb05424a9680db23d37db3cf02f05ede1d33528c5c5f9872db66e.jpg\",\"displayName\":\"TheGrinder\",\"lud16\":\"thegrinder@rizful.com\",\"display_name\":\"TheGrinder\",\"website\":\"https://zap.stream/thegrinder\",\"nip05\":\"thegrinder@nostrplebs.com\"}",
          "created_at": 1774868231,
          "id": "2dc93fea65b858e864520687927bb8e83374fff8eeb592c9cfaa8b470fc7b2db",
          "kind": 0,
          "pubkey": "6e75f7972397ca3295e0f4ca0fbc6eb9cc79be85bafdd56bd378220ca8eee74e",
          "sig": "4b2c21ff288b2e4e900f88429a0b4a8c3d6c248cab175b8e984d3251cf67578626583379cef99c73e85df3fc35407f292499df7124c3d854bfbf6ac0421a03ee",
          "tags": [["client","noStrudel","31990:266815e0c9210dfa324c6cba3573b14bee49da4209a9456f9484e5106cd408a5:1686066542546"]]
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
