export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  email: string;
  createdAt: Date | string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  createdAt: Date | string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdAt: Date | string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  editedAt?: Date | string | null;
  createdAt: Date | string;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface Attachment {
  id: string;
  messageId: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface PresenceStatus {
  userId: string;
  status: "online" | "away" | "dnd" | "offline";
  lastSeen: Date;
}

// Socket.io event types
export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:updated": (message: Message) => void;
  "message:deleted": (messageId: string) => void;
  "channel:typing": (data: { channelId: string; userId: string; username: string }) => void;
  "presence:update": (presence: PresenceStatus) => void;
}

export interface ClientToServerEvents {
  "channel:join": (channelId: string) => void;
  "channel:leave": (channelId: string) => void;
  "channel:typing": (channelId: string) => void;
}
