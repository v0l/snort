import { hexToBech32, NostrPrefix, sha256, unixNow } from "@snort/shared"
import { EventBuilder, EventKind, EventPublisher, type NostrEvent, PrivateKeySigner } from "@snort/system"

export interface User {
  name: string
  displayName: string
  privateKey: string
  pubkey: string
  npub: string
  nsec: string
  signer: PrivateKeySigner
  publisher: EventPublisher
}

function user(name: string, displayName: string): User {
  const privateKey = sha256(`snort-e2e-${name}`)
  const signer = new PrivateKeySigner(privateKey)
  const pubkey = signer.getPubKey()
  return {
    name,
    displayName,
    privateKey,
    pubkey,
    npub: hexToBech32(NostrPrefix.PublicKey, pubkey),
    nsec: hexToBech32(NostrPrefix.PrivateKey, privateKey),
    signer,
    publisher: new EventPublisher(signer, pubkey),
  }
}

export const alice = user("alice", "Alice Tester")
export const bob = user("bob", "Bob Builder")
export const carol = user("carol", "Carol Writer")
export const dave = user("dave", "Dave Stranger")
export const erin = user("erin", "Erin Quiet")
export const dvm = user("dvm", "Trending DVM")
export const freshDvm = user("fresh-dvm", "Fresh DVM")
export const walletService = user("wallet", "NWC Wallet")
export const walletClientSecret = sha256("snort-e2e-nwc-client")
export const NwcUri = `nostr+walletconnect://${walletService.pubkey}?relay=${encodeURIComponent("wss://relay.snort.test/")}&secret=${walletClientSecret}`

export const RelayUrl = "wss://relay.snort.test/"
export const ImageHost = "https://img.snort.test"
export const Nip05Domain = "snort.test"
export const Hashtag = "snorttest"
export const CashuToken =
  "cashuBpGFtd2h0dHBzOi8vODMzMy5zcGFjZTozMzM4YXVjc2F0YXSBomFpSACaHykyU-QeYXCCo2FhAmFzeEA0MDc5MTViYzIxMmJlNjFhNzdlM2U2ZDJhZWI0YzcyNzk4MGJkYTUxY2QwNmE2YWZjMjllMjg2MTc2OGE3ODM3YWNYIQK8kJeZfYGvssxzRrXkNFqTRr0qUG63lYWYpy8M-FFj6qNhYQhhc3hAZmUxNTEwOTMxNGU2MWQ3NzU2YjBmOGVlMGYyM2E2MjRhY2FhM2Y0ZTA0MmY2MTQzM2M3MjhjNzA1N2I5MzFiZWFjWCECno5QULiQp9bAlo2xa8HV1foEDqHeKE9uxp1hKZ9nEFlhZGpUaGFuayB5b3Uu"
export const LinkPreviewUrl = "https://news.snort.test/article"
export const BlossomServers = ["https://blossom-one.snort.test/", "https://blossom-two.snort.test/"]
export const GitViewerUrl = "https://git.snort.test/"
export const BobBlob = "b0".repeat(32)

async function sign(u: User, kind: EventKind, content: string, tags: Array<Array<string>>, age: number) {
  const eb = new EventBuilder()
    .kind(kind)
    .content(content)
    .createdAt(unixNow() - age)
  for (const t of tags) eb.tag(t)
  return await eb.buildAndSign(u.signer)
}

export interface World {
  events: Array<NostrEvent>
  notes: {
    bobHello: NostrEvent
    bobImage: NostrEvent
    carolReply: NostrEvent
    carolMention: NostrEvent
    aliceFirst: NostrEvent
    daveHashtag: NostrEvent
    carolArticle: NostrEvent
    carolFollowSet: NostrEvent
    bobPoll: NostrEvent
    carolLink: NostrEvent
    daveCashu: NostrEvent
    bobBlob: NostrEvent
    carolRepo: NostrEvent
    bobArticleComment: NostrEvent
    daveStrayComment: NostrEvent
    gitApp: NostrEvent
  }
  dmText: string
}

export async function buildWorld(): Promise<World> {
  const profiles = await Promise.all(
    [alice, bob, carol, dave, erin].map(u =>
      sign(
        u,
        EventKind.SetMetadata,
        JSON.stringify({
          name: u.name,
          display_name: u.displayName,
          about: `${u.displayName} is a test account`,
          picture: `${ImageHost}/${u.name}.png`,
          banner: `${ImageHost}/${u.name}-banner.png`,
          nip05: `${u.name}@${Nip05Domain}`,
          website: `https://${u.name}.${Nip05Domain}`,
          lud16: `${u.name}@${Nip05Domain}`,
        }),
        [],
        86_400,
      ),
    ),
  )

  const bobHello = await sign(bob, EventKind.TextNote, `Hello from Bob #${Hashtag}`, [["t", Hashtag]], 3_600)
  const bobImage = await sign(
    bob,
    EventKind.TextNote,
    `Look at this cat ${ImageHost}/cat.png`,
    [["imeta", `url ${ImageHost}/cat.png`, "m image/png", "dim 64x64"]],
    7_200,
  )
  const carolReply = await sign(
    carol,
    EventKind.TextNote,
    "Great post Bob!",
    [
      ["e", bobHello.id, RelayUrl, "root"],
      ["p", bob.pubkey],
    ],
    1_800,
  )
  const carolMention = await sign(
    carol,
    EventKind.TextNote,
    `Welcome to nostr nostr:${alice.npub}`,
    [["p", alice.pubkey]],
    900,
  )
  const aliceFirst = await sign(alice, EventKind.TextNote, "Alice's first post", [], 10_800)
  const daveHashtag = await sign(dave, EventKind.TextNote, `A stranger also likes #${Hashtag}`, [["t", Hashtag]], 5_400)
  const carolArticle = await sign(
    carol,
    EventKind.LongFormTextNote,
    "# Testing Snort\n\nAn article with a list:\n\n- [ ] open task\n- [x] done task\n\nAnd some **bold** text.",
    [
      ["d", "testing-snort"],
      ["title", "Testing Snort"],
      ["summary", "How the e2e suite works"],
      ["published_at", String(unixNow() - 20_000)],
    ],
    20_000,
  )

  const carolFollowSet = await sign(
    carol,
    EventKind.FollowSet,
    "",
    [
      ["d", "strangers"],
      ["title", "Strangers"],
      ["p", dave.pubkey],
    ],
    30_000,
  )

  const bobPoll = await sign(
    bob,
    EventKind.Polls,
    "Which relay do you use?",
    [
      ["poll_option", "0", "My own"],
      ["poll_option", "1", "A public one"],
    ],
    2_400,
  )
  const carolLink = await sign(carol, EventKind.TextNote, `Read this ${LinkPreviewUrl}`, [], 2_500)

  const bobBlob = await sign(bob, EventKind.TextNote, `Fresh upload ${BlossomServers[0]}${BobBlob}.png`, [], 2_700)
  const carolRepo = await sign(
    carol,
    30617 as EventKind,
    "",
    [
      ["d", "snort"],
      ["name", "snort"],
    ],
    2_800,
  )
  const gitApp = await sign(
    dvm,
    31990 as EventKind,
    JSON.stringify({ name: "Git Viewer", display_name: "Git Viewer" }),
    [
      ["d", "git-viewer"],
      ["k", "30617"],
      ["web", `${GitViewerUrl}<bech32>`, "nevent"],
    ],
    2_900,
  )
  const articleAddress = `${EventKind.LongFormTextNote}:${carol.pubkey}:${carolArticle.tags.find(t => t[0] === "d")?.[1]}`
  const bobArticleComment = await sign(
    bob,
    EventKind.Comment,
    "Great write up",
    [
      ["A", articleAddress],
      ["K", `${EventKind.LongFormTextNote}`],
      ["P", carol.pubkey],
      ["a", articleAddress],
      ["k", `${EventKind.LongFormTextNote}`],
      ["p", carol.pubkey],
    ],
    1_500,
  )
  const daveStrayComment = await sign(
    dave,
    EventKind.Comment,
    "Comment on something else entirely",
    [
      ["E", bobHello.id],
      ["K", `${EventKind.TextNote}`],
      ["P", bob.pubkey],
      ["e", bobHello.id],
      ["k", `${EventKind.TextNote}`],
      ["p", bob.pubkey],
    ],
    1_400,
  )
  const daveCashu = await sign(dave, EventKind.TextNote, `Free sats ${CashuToken}`, [], 2_600)

  const reactions = [
    await sign(
      carol,
      EventKind.Reaction,
      "+",
      [
        ["e", bobHello.id],
        ["p", bob.pubkey],
      ],
      1_700,
    ),
    await sign(
      bob,
      EventKind.Reaction,
      "+",
      [
        ["e", aliceFirst.id],
        ["p", alice.pubkey],
      ],
      1_600,
    ),
  ]
  const repost = await sign(
    carol,
    EventKind.Repost,
    JSON.stringify(bobImage),
    [
      ["e", bobImage.id, RelayUrl],
      ["p", bob.pubkey],
    ],
    1_500,
  )

  const lists = [
    await sign(
      alice,
      EventKind.ContactList,
      "",
      [
        ["p", bob.pubkey],
        ["p", carol.pubkey],
      ],
      80_000,
    ),
    await sign(bob, EventKind.ContactList, "", [["p", alice.pubkey]], 80_000),
    await sign(carol, EventKind.ContactList, "", [["p", bob.pubkey]], 80_000),
    await sign(alice, EventKind.Relays, "", [["r", RelayUrl]], 80_000),
    await sign(
      alice,
      EventKind.BlossomServerList,
      "",
      BlossomServers.map(s => ["server", s]),
      80_000,
    ),
    await sign(bob, EventKind.BlossomServerList, "", [["server", BlossomServers[1]]], 80_000),
    await sign(alice, EventKind.InterestsList, "", [["t", Hashtag]], 80_000),
    await sign(alice, EventKind.BookmarksList, "", [["e", bobImage.id]], 80_000),
    await sign(alice, EventKind.PinList, "", [["e", aliceFirst.id]], 80_000),
  ]

  const appData = await sign(
    alice,
    EventKind.AppData,
    await alice.signer.nip44Encrypt(JSON.stringify({ preferences: { trendingDvmPubkey: dvm.pubkey } }), alice.pubkey),
    [["d", "snort"]],
    80_000,
  )

  const dmText = "Hey Alice, this is a private message"
  const rumor = bob.publisher.createUnsigned(EventKind.ChatRumor, dmText, eb => eb.tag(["p", alice.pubkey]))
  const dm = await bob.publisher.giftWrap(await bob.publisher.sealRumor(rumor, alice.pubkey), alice.pubkey)

  return {
    events: [
      ...profiles,
      bobHello,
      bobImage,
      carolReply,
      carolMention,
      aliceFirst,
      daveHashtag,
      carolArticle,
      carolFollowSet,
      bobPoll,
      carolLink,
      daveCashu,
      bobBlob,
      carolRepo,
      gitApp,
      bobArticleComment,
      daveStrayComment,
      ...(await Promise.all(
        [dvm, freshDvm].map(d =>
          sign(
            d,
            31990 as EventKind,
            JSON.stringify({ name: d.displayName }),
            [
              ["d", `${d.name}-trending`],
              ["k", "5300"],
            ],
            3_000,
          ),
        ),
      )),
      ...reactions,
      repost,
      ...lists,
      appData,
      dm,
    ],
    notes: {
      bobHello,
      bobImage,
      carolReply,
      carolMention,
      aliceFirst,
      daveHashtag,
      carolArticle,
      carolFollowSet,
      bobPoll,
      carolLink,
      daveCashu,
      bobBlob,
      carolRepo,
      gitApp,
      bobArticleComment,
      daveStrayComment,
    },
    dmText,
  }
}

export async function trendingResult(request: NostrEvent, noteIds: Array<string>, from: User = dvm) {
  return await sign(
    from,
    request.kind + 1000,
    JSON.stringify(noteIds.map(id => ["e", id])),
    [
      ["e", request.id],
      ["p", request.pubkey],
      ["request", JSON.stringify(request)],
    ],
    0,
  )
}
