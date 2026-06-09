import { create } from "zustand";
import type { Workspace, Channel } from "@budnet/types";

interface WorkspaceState {
  activeWorkspace: Workspace | null;
  activeChannel: Channel | null;
  workspaces: Workspace[];
  channels: Channel[];
  setActiveWorkspace: (workspace: Workspace) => void;
  setActiveChannel: (channel: Channel) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setChannels: (channels: Channel[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: null,
  activeChannel: null,
  workspaces: [],
  channels: [],
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  setActiveChannel: (channel) => set({ activeChannel: channel }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setChannels: (channels) => set({ channels }),
}));
