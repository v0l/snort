enum EventKind {
  Unknown = -1,
  SetMetadata = 0,
  TextNote = 1,
  RecommendServer = 2,
  ContactList = 3, // NIP-02
  DirectMessage = 4, // NIP-04
  Deletion = 5, // NIP-09
  Repost = 6, // NIP-18
  Reaction = 7, // NIP-25
  BadgeAward = 8, // NIP-58
  Relays = 10002, // NIP-65
  Ephemeral = 20_000,
  Auth = 22242, // NIP-42
  PubkeyLists = 30000, // NIP-51a
  NoteLists = 30001, // NIP-51b
  TagLists = 30002, // NIP-51c
  Badge = 30009, // NIP-58
  ProfileBadges = 30008, // NIP-58
  ZapRequest = 9734, // NIP 57
  ZapReceipt = 9735, // NIP 57
}

export default EventKind;
