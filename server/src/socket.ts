import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "@budnet/types";

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

// userId → Set of socket IDs (multiple tabs/devices per user)
export const onlineUsers = new Map<string, Set<string>>();

export function initSocketIO(httpServer: HttpServer, corsOrigin: string) {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.on("connection", (socket) => {
    const userId = (socket.handshake.auth as { userId?: string }).userId;

    if (userId) {
      socket.join(`user:${userId}`);

      // Track presence
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId)!.add(socket.id);

      // Broadcast this user is online to everyone
      io.emit("presence:update", { userId, status: "online", lastSeen: new Date() });

      // Send current online users to the newly connected socket
      onlineUsers.forEach((_, uid) => {
        socket.emit("presence:update", { userId: uid, status: "online", lastSeen: new Date() });
      });
    }

    socket.on("channel:join", (channelId) => socket.join(`channel:${channelId}`));
    socket.on("channel:leave", (channelId) => socket.leave(`channel:${channelId}`));
    socket.on("channel:typing", (channelId) => {
      const uid = (socket.handshake.auth as { userId?: string }).userId ?? "";
      socket.to(`channel:${channelId}`).emit("channel:typing", {
        channelId,
        userId: uid,
        username: "",
      });
    });

    socket.on("disconnect", () => {
      if (!userId) return;
      const sockets = onlineUsers.get(userId);
      sockets?.delete(socket.id);
      if (!sockets?.size) {
        onlineUsers.delete(userId);
        io.emit("presence:update", { userId, status: "offline", lastSeen: new Date() });
      }
    });
  });

  return io;
}

export function getIO() {
  return io;
}
