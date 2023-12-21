import { io, Socket } from "socket.io-client";
import { WebRTCConnection } from "@/webrtc/WebRTCConnection";
import EventEmitter from "eventemitter3";
import { TaggedNostrEvent } from "@snort/system";

const MAX_CONNECTIONS = 5;

class WebRTCPool extends EventEmitter {
  private signalingServer: Socket;
  private peers: Map<string, WebRTCConnection> = new Map();
  private configuration: RTCConfiguration;
  private peerId: string;

  constructor(serverUrl: string, configuration: RTCConfiguration = {}, peerId: string) {
    super();
    this.signalingServer = io(serverUrl);
    this.configuration = configuration;
    this.peerId = peerId;
    this.registerSocketEvents();
  }

  private sayHello(): void {
    this.signalingServer.emit("hello", this.peerId);
  }

  public send(data: TaggedNostrEvent | string, recipients?: string[]): void {
    this.peers.forEach(conn => {
      if (!recipients || recipients.includes(conn.peerId)) {
        try {
          conn.send(typeof data === "string" ? data : JSON.stringify(data));
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  public createConnection(peerId: string): WebRTCConnection {
    if (this.peers.size >= MAX_CONNECTIONS) {
      throw new Error("Maximum connections reached");
    }
    const connection = new WebRTCConnection(this.signalingServer, this.configuration, peerId);
    connection.on("event", (event: TaggedNostrEvent | string) => this.emit("event", event));
    this.peers.set(peerId, connection);
    return connection;
  }

  private handleConnectionEvent(sender: string, action: (connection: WebRTCConnection) => Promise<void>): void {
    if (sender === this.peerId || this.peers.size >= MAX_CONNECTIONS) return;
    const connection = this.peers.get(sender) ?? this.createConnection(sender);
    action(connection);
  }

  private registerSocketEvents(): void {
    this.signalingServer.on("connect", () => {
      console.log("Connected to signaling server");
      this.sayHello();
    });

    this.signalingServer.on("offer", ({ offer, sender }: { offer: RTCSessionDescriptionInit; sender: string }) => {
      this.handleConnectionEvent(sender, async conn => await conn.handleOffer(offer));
    });

    this.signalingServer.on("answer", ({ answer, sender }: { answer: RTCSessionDescriptionInit; sender: string }) => {
      this.handleConnectionEvent(sender, async conn => await conn.handleAnswer(answer));
    });

    this.signalingServer.on(
      "candidate",
      ({ candidate, sender }: { candidate: RTCIceCandidateInit; sender: string }) => {
        this.handleConnectionEvent(sender, conn => conn.handleCandidate(candidate));
      },
    );

    this.signalingServer.on("hello", (sender: string) => {
      console.log("Received hello from", sender);
      this.handleConnectionEvent(sender, conn => conn.handleHello());
    });
  }

  public close(): void {
    console.log("closing pool");
    this.signalingServer.close();
    for (const conn of this.peers.values()) {
      conn.close();
    }
  }
}

export default WebRTCPool;
