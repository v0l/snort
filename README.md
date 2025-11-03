## Snort

Snort is a nostr UI built with React aiming for speed and efficiency.

Snort supports the following NIP's:

- [x] NIP-01: Basic protocol flow description
- [x] NIP-02: Contact List and Petnames (No petname support)
- [ ] NIP-03: OpenTimestamps Attestations for Events
- [x] NIP-04: Encrypted Direct Message
- [x] NIP-05: Mapping Nostr keys to DNS-based internet identifiers
- [x] NIP-06: Basic key derivation from mnemonic seed phrase
- [x] NIP-07: `window.nostr` capability for web browsers
- [x] NIP-08: Handling Mentions
- [x] NIP-09: Event Deletion
- [x] NIP-10: Conventions for clients' use of `e` and `p` tags in text events
- [x] NIP-11: Relay Information Document
- [x] NIP-13: Proof of Work
- [ ] NIP-14: Subject tag in text events
- [x] NIP-18: Reposts
- [x] NIP-19: bech32-encoded entities
- [x] NIP-21: `nostr:` Protocol handler (`web+nostr`)
- [x] NIP-23: Long form content
- [x] NIP-25: Reactions
- [x] NIP-26: Delegated Event Signing (Display delegated signings only)
- [x] NIP-27: Text note references
- [x] NIP-28: Public Chat
- [x] NIP-30: Custom Emoji
- [x] NIP-31: Alt tag for unknown events
- [x] NIP-36: Sensitive Content
- [x] NIP-38: User Statuses
- [ ] NIP-39: External Identities
- [ ] NIP-40: Expiration Timestamp
- [x] NIP-42: Authentication of clients to relays
- [x] NIP-44: Versioned encryption
- [x] NIP-46: Nostr connect (+bunker)
- [x] NIP-47: Nostr wallet connect
- [x] NIP-50: Search
- [x] NIP-51: Lists
- [x] NIP-53: Live Events
- [x] NIP-55: Android signer application
- [x] NIP-57: Zaps
- [x] NIP-58: Badges
- [x] NIP-59: Gift Wrap
- [x] NIP-65: Relay List Metadata
- [x] NIP-75: Zap Goals
- [x] NIP-78: App specific data
- [x] NIP-89: App handlers
- [x] NIP-90: Data Vending Machines
- [x] NIP-94: File Metadata
- [x] NIP-96: HTTP File Storage Integration (Draft)
- [x] NIP-98: HTTP Auth

### Translations

[![Crowdin](https://badges.crowdin.net/snort/localized.svg)](https://crowdin.com/project/snort)

Translations are managed on [Crowdin](https://crowdin.com/project/snort)

To extract translations run:

```bash
bun run pre:commit
```

This will create the source file `packages/app/src/translations/en.json`
