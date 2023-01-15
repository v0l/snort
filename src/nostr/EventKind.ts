const enum EventKind {
    Unknown = -1,
    SetMetadata = 0,
    TextNote = 1,
    RecommendServer = 2,
    ContactList = 3, // NIP-02
    DirectMessage = 4, // NIP-04
    Deletion = 5, // NIP-09
    Repost = 6, // NIP-18
    Reaction = 7 // NIP-25
};

export default EventKind;