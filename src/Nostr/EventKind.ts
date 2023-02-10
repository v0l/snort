const enum EventKind {
  Unknown = -1,
  SetMetadata = 0,
  TextNote = 1,
  RecommendServer = 2,
  ContactList = 3, // NIP-02
  DirectMessage = 4, // NIP-04
  Deletion = 5, // NIP-09
  Repost = 6, // NIP-18
  Reaction = 7, // NIP-25
  Relays = 10002, // NIP-65
  Auth = 22242, // NIP-42
  PubkeyLists = 30000, // NIP-51
  NoteLists = 30001, // NIP-51
  TagLists = 30002, // NIP-51
  ZapRequest = 9734, // NIP tba
  ZapReceipt = 9735, // NIP tba
}

export default EventKind;
