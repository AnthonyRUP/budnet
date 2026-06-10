import { create } from "zustand";
import type { Workspace, Channel } from "@budnet/types";

export interface DmParticipant {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface DmConversation {
  channelId: string;
  participants: DmParticipant[];
}

interface WorkspaceState {
  activeWorkspace: Workspace | null;
  activeChannel: Channel | null;
  workspaces: Workspace[];
  channels: Channel[];
  dms: DmConversation[];
  setActiveWorkspace: (workspace: Workspace) => void;
  setActiveChannel: (channel: Channel) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setChannels: (channels: Channel[]) => void;
  setDms: (dms: DmConversation[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: null,
  activeChannel: null,
  workspaces: [],
  channels: [],
  dms: [],
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  setActiveChannel: (channel) => set({ activeChannel: channel }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setChannels: (channels) => set({ channels }),
  setDms: (dms) => set({ dms }),
}));
