import { FormattedMessage } from "react-intl";

export default function NipDescription({ nip }: { nip: number }) {
  switch (nip) {
    case 1:
      return <FormattedMessage defaultMessage="Basic protocol flow description" />;
    case 2:
      return <FormattedMessage defaultMessage="Follow List" />;
    case 3:
      return <FormattedMessage defaultMessage="OpenTimestamps Attestations for Events" />;
    case 4:
      return <FormattedMessage defaultMessage="Encrypted Direct Message" />;
    case 5:
      return <FormattedMessage defaultMessage="Mapping Nostr keys to DNS-based internet identifiers" />;
    case 6:
      return <FormattedMessage defaultMessage="Basic key derivation from mnemonic seed phrase" />;
    case 7:
      return <FormattedMessage defaultMessage="window.nostr capability for web browsers" />;
    case 8:
      return <FormattedMessage defaultMessage="Handling Mentions" />;
    case 9:
      return <FormattedMessage defaultMessage="Event Deletion Request" />;
    case 10:
      return <FormattedMessage defaultMessage="Conventions for clients' use of e and p tags in text events" />;
    case 11:
      return <FormattedMessage defaultMessage="Relay Information Document" />;
    case 13:
      return <FormattedMessage defaultMessage="Proof of Work" />;
    case 14:
      return <FormattedMessage defaultMessage="Subject tag in text events" />;
    case 15:
      return <FormattedMessage defaultMessage="Nostr Marketplace (for resilient marketplaces)" />;
    case 17:
      return <FormattedMessage defaultMessage="Private Direct Messages" />;
    case 18:
      return <FormattedMessage defaultMessage="Reposts" />;
    case 19:
      return <FormattedMessage defaultMessage="bech32-encoded entities" />;
    case 21:
      return <FormattedMessage defaultMessage="nostr: URI scheme" />;
    case 23:
      return <FormattedMessage defaultMessage="Long-form Content" />;
    case 24:
      return <FormattedMessage defaultMessage="Extra metadata fields and tags" />;
    case 25:
      return <FormattedMessage defaultMessage="Reactions" />;
    case 26:
      return <FormattedMessage defaultMessage="Delegated Event Signing" />;
    case 27:
      return <FormattedMessage defaultMessage="Text Note References" />;
    case 28:
      return <FormattedMessage defaultMessage="Public Chat" />;
    case 29:
      return <FormattedMessage defaultMessage="Relay-based Groups" />;
    case 30:
      return <FormattedMessage defaultMessage="Custom Emoji" />;
    case 31:
      return <FormattedMessage defaultMessage="Dealing with Unknown Events" />;
    case 32:
      return <FormattedMessage defaultMessage="Labeling" />;
    case 34:
      return <FormattedMessage defaultMessage="git stuff" />;
    case 35:
      return <FormattedMessage defaultMessage="Torrents" />;
    case 36:
      return <FormattedMessage defaultMessage="Sensitive Content" />;
    case 38:
      return <FormattedMessage defaultMessage="User Statuses" />;
    case 39:
      return <FormattedMessage defaultMessage="External Identities in Profiles" />;
    case 40:
      return <FormattedMessage defaultMessage="Expiration Timestamp" />;
    case 42:
      return <FormattedMessage defaultMessage="Authentication of clients to relays" />;
    case 44:
      return <FormattedMessage defaultMessage="Versioned Encryption" />;
    case 45:
      return <FormattedMessage defaultMessage="Counting results" />;
    case 46:
      return <FormattedMessage defaultMessage="Nostr Connect" />;
    case 47:
      return <FormattedMessage defaultMessage="Wallet Connect" />;
    case 48:
      return <FormattedMessage defaultMessage="Proxy Tags" />;
    case 49:
      return <FormattedMessage defaultMessage="Private Key Encryption" />;
    case 50:
      return <FormattedMessage defaultMessage="Search Capability" />;
    case 51:
      return <FormattedMessage defaultMessage="Lists" />;
    case 52:
      return <FormattedMessage defaultMessage="Calendar Events" />;
    case 53:
      return <FormattedMessage defaultMessage="Live Activities" />;
    case 54:
      return <FormattedMessage defaultMessage="Wiki" />;
    case 55:
      return <FormattedMessage defaultMessage="Android Signer Application" />;
    case 56:
      return <FormattedMessage defaultMessage="Reporting" />;
    case 57:
      return <FormattedMessage defaultMessage="Lightning Zaps" />;
    case 58:
      return <FormattedMessage defaultMessage="Badges" />;
    case 59:
      return <FormattedMessage defaultMessage="Gift Wrap" />;
    case 64:
      return <FormattedMessage defaultMessage="Chess (PGN)" />;
    case 65:
      return <FormattedMessage defaultMessage="Relay List Metadata" />;
    case 70:
      return <FormattedMessage defaultMessage="Protected Events" />;
    case 71:
      return <FormattedMessage defaultMessage="Video Events" />;
    case 72:
      return <FormattedMessage defaultMessage="Moderated Communities" />;
    case 73:
      return <FormattedMessage defaultMessage="External Content IDs" />;
    case 75:
      return <FormattedMessage defaultMessage="Zap Goals" />;
    case 78:
      return <FormattedMessage defaultMessage="Application-specific data" />;
    case 84:
      return <FormattedMessage defaultMessage="Highlights" />;
    case 89:
      return <FormattedMessage defaultMessage="Recommended Application Handlers" />;
    case 90:
      return <FormattedMessage defaultMessage="Data Vending Machines" />;
    case 92:
      return <FormattedMessage defaultMessage="Media Attachments" />;
    case 94:
      return <FormattedMessage defaultMessage="File Metadata" />;
    case 96:
      return <FormattedMessage defaultMessage="HTTP File Storage Integration" />;
    case 98:
      return <FormattedMessage defaultMessage="HTTP Auth" />;
    case 99:
      return <FormattedMessage defaultMessage="Classified Listings" />;
    default:
      return (
        <FormattedMessage
          defaultMessage="Unknown NIP-{x}"
          values={{
            x: nip.toString().padStart(2, "0"),
          }}
        />
      );
  }
}
