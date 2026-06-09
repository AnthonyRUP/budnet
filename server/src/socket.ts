import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "@budnet/types";

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

export function initSocketIO(httpServer: HttpServer, corsOrigin: string) {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("channel:join", (channelId) => socket.join(`channel:${channelId}`));
    socket.on("channel:leave", (channelId) => socket.leave(`channel:${channelId}`));
    socket.on("channel:typing", (channelId) => {
      const userId = (socket.handshake.auth as { userId?: string }).userId ?? "";
      socket.to(`channel:${channelId}`).emit("channel:typing", {
        channelId,
        userId,
        username: "",
      });
    });
  });

  return io;
}

export function getIO() {
  return io;
}
