import { parseNostrLink } from "@snort/system";
import { SnortBot } from "../src/index";

const noGoodLink = parseNostrLink("npub12hcytyr8fumy3axde8wgeced523gyp6v6zczqktwuqeaztfc2xzsz3rdp4");

SnortBot.simple("example")
  .link(noGoodLink)
  .relay("wss://relay.damus.io")
  .relay("wss://nos.lol")
  .relay("wss://relay.nostr.band")
  .profile({
    name: "PingBot",
    picture: "https://nostr.download/572f5ff8286e8c719196f904fed24aef14586ec8181c14b09efa726682ef48ef",
    lud16: "kieran@zap.stream",
    about: "An example bot",
  })
  .command("!ping", h => {
    h.reply("PONG!");
  })
  .run();
