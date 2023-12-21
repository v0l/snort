import { Socket } from "socket.io-client";
import EventEmitter from "eventemitter3";

export class WebRTCConnection extends EventEmitter {
  private peerConnection: RTCPeerConnection;
  private dataChannel: RTCDataChannel;

  constructor(
    private socket: Socket,
    configuration: RTCConfiguration,
    public peerId: string,
  ) {
    super();
    this.peerConnection = new RTCPeerConnection(configuration);
    this.dataChannel = this.peerConnection.createDataChannel("data");
    this.registerPeerConnectionEvents();
    this.setupDataChannel();
  }

  private log(...args: any[]): void {
    console.log(this.peerId, ...args);
  }

  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    this.log("Received offer", offer);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await this.sendLocalDescription("answer");
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    this.log("Received answer", answer);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  public handleCandidate(candidate: RTCIceCandidateInit): void {
    this.log("Received ICE candidate", candidate);
    this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private async sendLocalDescription(type: "offer" | "answer"): Promise<void> {
    let description;
    if (type === "offer") {
      description = await this.peerConnection.createOffer();
    } else {
      description = await this.peerConnection.createAnswer();
    }
    await this.peerConnection.setLocalDescription(description);
    this.socket.emit(type, { [type]: description, recipient: this.peerId });
    this.log(`Sent ${type}`, description);
  }

  private setupDataChannel(): void {
    this.dataChannel.onopen = () => this.log("Data channel opened");
    this.dataChannel.onclose = () => this.log("Data channel closed");
    this.dataChannel.onmessage = event => this.handleDataChannelMessage(event);
  }

  private handleDataChannelMessage(event: MessageEvent): void {
    this.log(`-> "${event.data}"`);
    if (event.data === "ping") {
      this.send("pong");
    } else {
      try {
        const data = JSON.parse(event.data);
        this.emit("event", data);
      } catch (e) {
        // Ignore
      }
    }
  }

  public send(data: any): void {
    if (this.dataChannel.readyState === "open") {
      this.log(`<- "${data}"`);
      this.dataChannel.send(data);
    }
  }

  public async handleHello(): Promise<void> {
    if (this.peerConnection.connectionState === "new") {
      await this.sendLocalDescription("offer");
    }
  }

  private registerPeerConnectionEvents(): void {
    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.log("Local ICE candidate:", event.candidate);
        this.socket.emit("candidate", { candidate: event.candidate.toJSON(), recipient: this.peerId });
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      this.log("ICE Connection State Change:", this.peerConnection.iceConnectionState);
    };

    this.peerConnection.onconnectionstatechange = () => {
      this.log("WebRTC Connection State Change:", this.peerConnection.connectionState);
    };

    this.peerConnection.ondatachannel = event => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  public close(): void {
    this.peerConnection.close();
  }
}
