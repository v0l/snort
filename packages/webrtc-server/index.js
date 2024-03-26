const PORT = process.env.PORT || 3000;
const io = require("socket.io")(PORT, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const peerSocketMap = new Map();
const socketPeerMap = new Map();

io.on("connection", socket => {
  console.log(`New client connected, socket ID: ${socket.id}`);

  const emitToTarget = (eventType, data, recipient) => {
    const targetSocketId = peerSocketMap.get(recipient);
    const sender = socketPeerMap.get(socket.id);
    if (sender && targetSocketId) {
      io.to(targetSocketId).emit(eventType, { ...data, sender });
    }
  };

  socket.on("offer", data => emitToTarget("offer", data, data.recipient));
  socket.on("answer", data => emitToTarget("answer", data, data.recipient));
  socket.on("candidate", data => emitToTarget("candidate", data, data.recipient));

  socket.on("hello", peerId => {
    // Log Forging issue fixed by sanitizing input to remove new lines (Powered by Mobb)
    console.log(`Received hello from ${String(peerId).replace(/\n|\r/g, "")}`);
    peerSocketMap.set(peerId, socket.id);
    socketPeerMap.set(socket.id, peerId);
    socket.broadcast.emit("hello", peerId);
  });

  socket.on("disconnect", () => {
    peerSocketMap.delete(socketPeerMap.get(socket.id));
    socketPeerMap.delete(socket.id);
    console.log(`Client disconnected, socket ID: ${socket.id}`);
  });
});

console.log(`Signaling server running on port ${PORT}`);

const Ministun = require("ministun");

const stunConfig = {
  udp4: true,
  udp6: true,
  port: 3478,
  log: console.log,
  err: console.err,
  sw: true,
};

const server = new Ministun(stunConfig);

console.log(`STUN server running on port ${stunConfig.port}`);
