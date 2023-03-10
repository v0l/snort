import { defineMessages } from "react-intl";

export default defineMessages({
  SaveKeys: {
    defaultMessage: "Save your keys!",
  },
  SaveKeysHelp: {
    defaultMessage:
      "Your private key is your password. If you lose this key, you will lose access to your account! Copy it and keep it in a safe place. There is no way to reset your private key.",
  },
  YourPubkey: { defaultMessage: "Your public key" },
  YourPrivkey: { defaultMessage: "Your private key" },
  YourMnemonic: { defaultMessage: "Your mnemonic phrase" },
  KeysSaved: { defaultMessage: "I have saved my keys, continue" },
  WhatIsSnort: { defaultMessage: "What is Snort and how does it work?" },
  WhatIsSnortIntro: {
    defaultMessage: `Snort is a Nostr UI, nostr is a decentralised protocol for saving and distributing "notes".`,
  },
  WhatIsSnortNotes: {
    defaultMessage: `Notes hold text content, the most popular usage of these notes is to store "tweet like" messages.`,
  },

  WhatIsSnortExperience: { defaultMessage: "Snort is designed to have a similar experience to Twitter." },
  HowKeysWork: { defaultMessage: "How do keys work?" },
  DigitalSignatures: {
    defaultMessage: `Nostr uses digital signature technology to provide tamper proof notes which can safely be replicated to many relays to provide redundant storage of your content.`,
  },
  TamperProof: {
    defaultMessage: `This means that nobody can modify notes which you have created and everybody can easily verify that the notes they are reading are created by you.`,
  },
  Bitcoin: {
    defaultMessage: `This is the same technology which is used by Bitcoin and has been proven to be extremely secure.`,
  },
  Extensions: {
    defaultMessage: `It is recommended to use one of the following browser extensions if you are on a desktop computer to secure your key:`,
  },
  ExtensionsNostr: { defaultMessage: `You can also use these extensions to login to most Nostr sites.` },
  ImproveSecurity: { defaultMessage: "Improve login security with browser extensions" },
  PickUsername: { defaultMessage: "Pick a username" },
  UsernameHelp: {
    defaultMessage:
      "On Nostr, many people have the same username. User names and identity are separate things. You can get a unique identifier in the next step.",
  },
  Username: { defaultMessage: "Username" },
  UsernamePlaceholder: { defaultMessage: "e.g. Jack" },
  PopularAccounts: { defaultMessage: "Follow some popular accounts" },
  Skip: { defaultMessage: "Skip" },
  Done: { defaultMessage: "Done!" },
  ImportTwitter: { defaultMessage: "Import Twitter Follows (optional)" },
  TwitterPlaceholder: { defaultMessage: "Twitter username..." },
  FindYourFollows: { defaultMessage: "Find your twitter follows on nostr (Data provided by {provider})" },
  TwitterUsername: { defaultMessage: "Twitter username" },
  FollowsOnNostr: { defaultMessage: "{username}'s Follows on Nostr" },
  NoUsersFound: { defaultMessage: "No nostr users found for {twitterUsername}" },
  FailedToLoad: { defaultMessage: "Failed to load follows, please try again later" },
  Check: { defaultMessage: "Check" },
  Next: { defaultMessage: "Next" },
  SetupProfile: { defaultMessage: "Setup your Profile" },
  Identifier: { defaultMessage: "Get an identifier (optional)" },
  IdentifierHelp: {
    defaultMessage:
      "Getting an identifier helps confirm the real you to people who know you. Many people can have a username @jack, but there is only one jack@cash.app.",
  },
  PreventFakes: { defaultMessage: "Prevent fake accounts from imitating you" },
  EasierToFind: { defaultMessage: "Make your profile easier to find and share" },
  Funding: { defaultMessage: "Fund developers and platforms providing NIP-05 verification services" },
  NameSquatting: {
    defaultMessage:
      "Name-squatting and impersonation is not allowed. Snort and our partners reserve the right to terminate your handle (not your account - nobody can take that away) for violating this rule.",
  },
  PreviewOnSnort: { defaultMessage: "Preview on snort" },
  GetSnortId: { defaultMessage: "Get a Snort identifier" },
  GetSnortIdHelp: {
    defaultMessage:
      "Only Snort and our integration partner identifier gives you a colorful domain name, but you are welcome to use other services too.",
  },
  GetPartnerId: { defaultMessage: "Get a partner identifier" },
  GetPartnerIdHelp: { defaultMessage: "We have also partnered with nostrplebs.com to give you more options" },
  Ready: { defaultMessage: "You're ready!" },
  Share: { defaultMessage: "Share your thoughts with {link}" },
  World: { defaultMessage: "the world" },
});
