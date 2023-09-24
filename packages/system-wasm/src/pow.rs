use crate::Event;

pub fn pow(ev: &mut Event, target: u8) {
    let mut ctr = 0u32;
    let mut nonce_tag_idx = ev.tags.iter().position(|x| x[0] == "nonce");
    if nonce_tag_idx.is_none() {
        nonce_tag_idx = Some(ev.tags.len());
        ev.tags.push(vec!["nonce".to_owned(), ctr.to_string(), target.to_string()]);
    }
    loop {
        ev.tags[nonce_tag_idx.unwrap()][1] = ctr.to_string();

        let new_id = make_id(ev);
        if count_leading_zeros(&new_id) >= target {
            ev.id = Some(new_id);
            break;
        }

        ctr += 1;
    }
}

fn count_leading_zeros(str: &String) -> u8 {
    let mut count = 0;

    for x in hex::decode(str).unwrap() {
        if x == 0u8 {
            count += 8;
        } else {
            count += x.leading_zeros();
            break;
        }
    }

    count as u8
}

fn make_id(ev: &Event) -> String {
    let mut v = "[0,\"".to_owned();
    v.push_str(&ev.pubkey);
    v.push_str("\",");
    v.push_str(&ev.created_at.to_string());
    v.push(',');
    v.push_str(&ev.kind.to_string());
    v.push_str(",[");
    v.push_str(ev.tags.iter().map(|x| {
        let mut y = "[".to_owned();
        y.push_str(x.iter().map(|z| ["\"", z, "\""].join("")).collect::<Vec<String>>().join(",").as_str());
        y.push(']');
        y
    }).collect::<Vec<String>>().join(",").as_str());
    v.push_str("],\"");
    v.push_str(&ev.content);
    v.push_str("\"]");
    sha256::digest(v)
}

#[cfg(test)]
mod tests {
    use serde::Deserialize;
    use serde_json::json;
    use crate::Event;

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
            [
              "e",
              "ad17146f086345a12583b537daabdf49ccc5cd09e2c0b4816c835f397b693e6b",
              "wss://nos.lol/",
              "root"
            ],
            [
              "e",
              "72759bf1f525e9715f4e6d22381f53dc4d2ab47d7aaac11340e7fced13e10b11",
              "wss://nos.lol/",
              "reply"
            ],
            [
              "p",
              "63fe6318dc58583cfe16810f86dd09e18bfd76aabc24a0081ce2856f330504ed"
            ],
            [
              "p",
              "1bc70a0148b3f316da33fe3c89f23e3e71ac4ff998027ec712b905cd24f6a411"
            ],
            [
              "nonce",
              "7403",
              "18"
            ]
          ]
        })).ok().unwrap();

        assert_eq!(super::make_id(&ev), ev.id.unwrap())
    }

    #[test]
    fn count_zeros() {
        assert_eq!(10u8.leading_zeros(), 4);
        assert_eq!(super::count_leading_zeros(&"00".to_owned()), 8);
        assert_eq!(super::count_leading_zeros(&"0000051bca8ee62220b34827358dca69284734a2e7420f3c4b814901a531c767".to_owned()), 21)
    }
}