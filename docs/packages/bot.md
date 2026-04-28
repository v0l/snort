# @snort/bot

Framework for building Nostr chat bots, primarily for zap.stream live streams.

## Installation

```bash
bun add @snort/bot
```

## Overview

`@snort/bot` provides `SnortBot` — a simple bot framework that monitors NIP-53 live streams (kind 30311) and reacts to chat messages (kind 1311).

## Quick Start

```typescript
import { SnortBot } from '@snort/bot'

const bot = SnortBot.simple("my-bot")

bot
  .relay("wss://relay.snort.social")
  .link(NostrLink.profile("streamer-pubkey"))
  .command("!hello", msg => {
    msg.reply("Hello there!")
  })
  .on("message", msg => {
    console.log(`${msg.from}: ${msg.message}`)
  })
  .run()
```

## SnortBot

### Constructor

```typescript
new SnortBot(
  name: string,
  system: SystemInterface,
  publisher: EventPublisher,
)
```

### `SnortBot.simple(name: string): SnortBot`

Create a bot with a fresh `NostrSystem` and random keypair.

```typescript
const bot = SnortBot.simple("my-bot")
```

### Methods

#### `link(a: NostrLink): this`

Add a stream or profile link to monitor.

```typescript
bot.link(NostrLink.profile("streamer-pubkey"))
bot.link(NostrLink.fromEvent(streamEvent))
```

#### `relay(r: string): this`

Add a relay for communication.

```typescript
bot.relay("wss://relay.snort.social")
```

#### `profile(p: UserMetadata): this`

Set the bot's profile.

```typescript
bot.profile({
  name: "My Bot",
  about: "I am a bot",
  picture: "https://example.com/bot.png",
})
```

#### `command(cmd: string, handler: CommandHandler): this`

Register a command handler. Triggers when a message starts with `cmd`.

```typescript
bot.command("!ping", msg => {
  msg.reply("Pong!")
})

bot.command("!tip", msg => {
  const amount = msg.message.split(" ")[1]
  msg.reply(`Tipping ${amount} sats!`)
})
```

#### `run(): this`

Start the bot. Connects to relays, subscribes to streams and chat.

#### `notify(msg: string): Promise<void>`

Send a message to all active streams.

```typescript
await bot.notify("Bot is now online!")
```

### Properties

#### `activeStreams: TaggedNostrEvent[]`

Get all currently live streams.

## BotMessage

```typescript
interface BotMessage {
  link: NostrLink       // The stream link this message belongs to
  from: string          // Pubkey of the message author
  message: string       // Message content
  event: NostrEvent     // Original event
  reply: (msg: string) => Promise<void>  // Reply to this message
}
```

## Events

| Event | Callback | Description |
|-------|----------|-------------|
| `message` | `(msg: BotMessage) => void` | Chat message received |
| `event` | `(ev: NostrEvent) => void` | Any event received |

## Complete Example

```typescript
import { SnortBot } from '@snort/bot'
import { NostrLink } from '@snort/system'

const bot = SnortBot.simple("demo-bot")

bot
  .relay("wss://relay.snort.social")
  .relay("wss://nos.lol")
  .link(NostrLink.profile("streamer-pubkey-hex"))
  .profile({
    name: "Demo Bot",
    about: "A demo bot for zap.stream",
  })
  .command("!hello", msg => {
    msg.reply(`Hello @${msg.from.slice(0, 8)}!`)
  })
  .command("!time", msg => {
    msg.reply(`Current time: ${new Date().toISOString()}`)
  })
  .on("message", msg => {
    console.log(`[${msg.link.encode()}] ${msg.from}: ${msg.message}`)
  })
  .run()

// Notify all streams
await bot.notify("Bot is now running! Type !hello to say hi.")
```

## See Also

- [@snort/system](/packages/system) - Core system
- [Event Builder & Publisher](/packages/system/events) - Building events
