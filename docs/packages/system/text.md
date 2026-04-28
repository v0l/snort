# Text Parsing

Parse Nostr event content into structured fragments (mentions, links, media, invoices, hashtags, etc.).

## FragmentType

```typescript
enum FragmentType {
  Text = "text",               // Plain text
  Link = "link",               // External URL
  Mention = "mention",         // @ mention of a Nostr entity
  Invoice = "invoice",         // Lightning invoice (lnbc...)
  Media = "media",             // Image or video URL
  Cashu = "cashu",             // Cashu token
  Hashtag = "hashtag",         // #hashtag
  CustomEmoji = "custom_emoji", // :emoji: shortcode
  HighlightedText = "highlighted_text", // Highlighted text
  CodeBlock = "code_block",   // ```code```
  InlineCode = "inline_code", // `code`
  BlossomBlob = "blossom",    // blossom:// URL
  MagnetLink = "magnet",      // magnet: torrent link
}
```

## ParsedFragment

Each fragment returned by `transformText` is a `ParsedFragment`:

```typescript
interface ParsedFragment {
  type: FragmentType
  content: string        // The raw fragment content string
  mimeType?: string      // Media mime type for "media" fragments
  language?: string      // Code language or spoken language
  data?: object          // Opaque data (e.g. NIP-94 imeta for media)
}
```

## Usage

The text parser splits event content into typed fragments for rendering:

```typescript
import { transformText } from '@snort/system'

const fragments = transformText(event.content, event.tags)

for (const fragment of fragments) {
  switch (fragment.type) {
    case FragmentType.Text:
      return <span>{fragment.content}</span>
    case FragmentType.Link:
      return <a href={fragment.content}>{fragment.content}</a>
    case FragmentType.Mention:
      return <NostrMention link={fragment.content} />
    case FragmentType.Invoice:
      return <Invoice bolt11={fragment.content} />
    case FragmentType.Media:
      return <img src={fragment.content} />
    case FragmentType.Hashtag:
      return <a href={`/tag/${fragment.content}`}>#{fragment.content}</a>
    case FragmentType.Cashu:
      return <CashuToken token={fragment.content} />
    case FragmentType.BlossomBlob:
      return <a href={fragment.content}>blossom:{fragment.content}</a>
    case FragmentType.MagnetLink:
      return <a href={fragment.content}>magnet link</a>
    case FragmentType.CodeBlock:
      return <pre><code>{fragment.content}</code></pre>
    case FragmentType.InlineCode:
      return <code>{fragment.content}</code>
    case FragmentType.CustomEmoji:
      return <img className="emoji" src={fragment.content} />
  }
}
```

## parseIMeta

Parse `imeta` tags from an event into a lookup of URL → NIP-94 metadata. This is used internally by `transformText` to attach media metadata to media fragments.

```typescript
import { parseIMeta } from '@snort/system'

const imeta = parseIMeta(event.tags)
// Record<string, Nip94Tags> | undefined
```

## Regex Patterns

Available from `@snort/system`:

| Constant | Pattern | Matches |
|----------|---------|---------|
| `HashtagRegex` | `#word` | Hashtags |
| `MentionNostrEntityRegex` | `@npub1...`, `@nevent1...` | Nostr entity mentions |
| `InvoiceRegex` | `lnbc...` | Lightning invoices |
| `CashuRegex` | `cashuA...` | Cashu tokens |
| `TagRefRegex` | `#[0]` | Tag position references |
| `FileExtensionRegex` | `.ext` | File extensions |
| `MarkdownCodeRegex` | ` ```...``` ` | Markdown code blocks |
| `InlineCodeRegex` | `` `...` `` | Inline code |

## See Also

- [Examples → Text Parsing](/examples/text)
