# `@snort/nostr`

A strongly-typed nostr client for Node and the browser.

## NIP support

### Applicable

The goal of the project is to have all of the following implemented
and tested against a real-world relay implementation.

_Progress: 4/34 (12%)._

- [X] NIP-01: Basic protocol flow description
- [ ] NIP-02: Contact List and Petnames
- [ ] NIP-03: OpenTimestamps Attestations for Events
- [X] NIP-04: Encrypted Direct Message
- [ ] NIP-05: Mapping Nostr keys to DNS-based internet identifiers
- [ ] NIP-06: Basic key derivation from mnemonic seed phrase
- [ ] NIP-07: window.nostr capability for web browsers
- [ ] NIP-08: Handling Mentions
- [ ] NIP-09: Event Deletion
- [ ] NIP-10: Conventions for clients' use of `e` and `p` tags in text events
  - TODO Check if this applies
- [ ] NIP-11: Relay Information Document
- [ ] NIP-12: Generic Tag Queries
- [ ] NIP-13: Proof of Work
- [ ] NIP-14: Subject tag in text events
- [X] NIP-15: End of Stored Events Notice
- [ ] NIP-19: bech32-encoded entities
  - [X] `npub`
  - [X] `nsec`
  - [ ] `nprofile`
- [X] NIP-20: Command Results
- [ ] NIP-21: `nostr:` URL scheme
- [ ] NIP-23: Long-form Content
- [ ] NIP-25: Reactions
- [ ] NIP-26: Delegated Event Signing
- [ ] NIP-28: Public Chat
- [ ] NIP-36: Sensitive Content
- [ ] NIP-39: External Identities in Profiles
- [ ] NIP-40: Expiration Timestamp
- [ ] NIP-42: Authentication of clients to relays
- [ ] NIP-46: Nostr Connect
  - Not sure how much of this applies, but I sure would love to see WalletConnect disappear
- [ ] NIP-50: Keywords filter
- [ ] NIP-51: Lists
- [ ] NIP-56: Reporting
- [ ] NIP-57: Lightning Zaps
- [ ] NIP-58: Badges
- [ ] NIP-65: Relay List Metadata
- [ ] NIP-78: Application-specific data

### Not Applicable

These NIPs only apply to relays and have no implications for a generic nostr client.

- NIP-16: Event Treatment
- NIP-22: Event `created_at` Limits
- NIP-33: Parameterized Replaceable Events

### Others

_If you notice an accepted NIP missing from both lists above, please [open an
issue](https://github.com/v0l/snort/issues/new?assignees=&labels=&template=feature_request.md&title=)
to let us know_.
