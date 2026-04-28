# Text Parsing Examples

Real-world usage of `transformText`, `readNip94Tags`, and `nip94TagsToIMeta` from the Snort app.

## Cached text transformation for performance

Text parsing can be expensive in timelines with many notes. The app caches results by event ID:

```typescript
// useTextTransformCache.tsx
export function transformTextCached(id: string, content: string, tags: Array<Array<string>>): Array<ParsedFragment> {
  const newCache = transformText(content, tags)
  return newCache
}
```

## Extracting media from events using NIP-94 imeta

Combine `transformText` fragments with `readNip94TagsFromIMeta` to get full file metadata for attachments:

```typescript
// getEventMedia.ts
const meta = event.tags.filter(a => a[0] === "imeta").map(readNip94TagsFromIMeta)
```

## Building imeta tags from upload metadata

When creating notes with file attachments, convert NIP-94 metadata back to `imeta` tags:

```typescript
// NoteCreator.tsx
const n94 = (at.nip94?.length ?? 0) > 0
  ? readNip94Tags(at.nip94!)
  : ({ url: at.url, hash: at.sha256, size: at.size, mimeType: at.type } as Nip94Tags)

n94.fallback ??= []
n94.fallback.push(...v.slice(1).filter(a => a.url).map(a => a.url!))
extraTags?.push(nip94TagsToIMeta(n94))
```
