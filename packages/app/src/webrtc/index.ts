import { LoginStore } from "@/Login";
import WebRTCPool from "@/webrtc/WebRTCPool";
import { System } from "@/index";
import { TaggedNostrEvent } from "@snort/system";

let publicKey: string | undefined;
let pool: WebRTCPool | undefined;
let interval: NodeJS.Timeout | undefined;

LoginStore.hook(() => {
  const login = LoginStore.takeSnapshot();
  if (!login.publicKey || login.readonly || login.publicKey === publicKey) return;
  publicKey = login.publicKey;
  if (location.hostname === "localhost") {
    pool?.close();
    interval && clearInterval(interval);
    pool = new WebRTCPool(
      "http://localhost:3000",
      {
        iceServers: [{ urls: "stun:localhost:3478" }],
      },
      login.publicKey,
    );
    pool.on("event", (event: TaggedNostrEvent) => {
      console.log("event from webrtc", event);
      System.HandleEvent(event);
    });
    interval = setInterval(() => pool?.send("ping"), 10000);
  }
});

export function getWebRtcPool(): WebRTCPool | undefined {
  return pool;
}
