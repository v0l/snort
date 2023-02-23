## Snort

Snort is a nostr UI built with React aiming for speed and efficiency.

Snort supports the following NIP's:

- [x] NIP-01: Basic protocol flow description
- [x] NIP-02: Contact List and Petnames (No petname support)
- [ ] NIP-03: OpenTimestamps Attestations for Events
- [x] NIP-04: Encrypted Direct Message
- [x] NIP-05: Mapping Nostr keys to DNS-based internet identifiers
- [ ] NIP-06: Basic key derivation from mnemonic seed phrase
- [x] NIP-07: `window.nostr` capability for web browsers
- [x] NIP-08: Handling Mentions
- [x] NIP-09: Event Deletion
- [x] NIP-10: Conventions for clients' use of `e` and `p` tags in text events
- [x] NIP-11: Relay Information Document
- [x] NIP-12: Generic Tag Queries
- [ ] NIP-13: Proof of Work
- [ ] NIP-14: Subject tag in text events
- [x] NIP-15: End of Stored Events Notice
- [x] NIP-19: bech32-encoded entities
- [x] NIP-20: Command Results
- [x] NIP-23: Long form notes
- [x] NIP-21: `nostr:` Protocol handler (`web+nostr`)
- [x] NIP-25: Reactions
- [x] NIP-26: Delegated Event Signing (Display delegated signings only)
- [ ] NIP-28: Public Chat
- [ ] NIP-36: Sensitive Content
- [ ] NIP-40: Expiration Timestamp
- [ ] NIP-42: Authentication of clients to relays
- [x] NIP-50: Search
- [x] NIP-51: Lists
- [x] NIP-65: Relay List Metadata

### Running

This repository is a yarn workspace. To install dependencies, run `yarn` from the project root.

To run the application, use

```
$ yarn start
```

To build the application and nostr package, use

```
$ yarn build
```

### Translations

Translations are managed on [Crowdin](https://crowdin.com/project/snort)

To extract translations run:
```bash
yarn workspace @snort/app intl-extract
yarn workspace @snort/app intl-compile
```

This will create the source file `packages/app/src/translations/en.json`