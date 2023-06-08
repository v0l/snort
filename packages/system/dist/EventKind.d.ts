declare enum EventKind {
    Unknown = -1,
    SetMetadata = 0,
    TextNote = 1,
    RecommendServer = 2,
    ContactList = 3,
    DirectMessage = 4,
    Deletion = 5,
    Repost = 6,
    Reaction = 7,
    BadgeAward = 8,
    SnortSubscriptions = 1000,
    Polls = 6969,
    FileHeader = 1063,
    Relays = 10002,
    Ephemeral = 20000,
    Auth = 22242,
    PubkeyLists = 30000,
    NoteLists = 30001,
    TagLists = 30002,
    Badge = 30009,
    ProfileBadges = 30008,
    ZapstrTrack = 31337,
    ZapRequest = 9734,
    ZapReceipt = 9735,
    HttpAuthentication = 27235
}
export default EventKind;
//# sourceMappingURL=EventKind.d.ts.map