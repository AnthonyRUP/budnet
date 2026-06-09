import { create } from "zustand";
import type { PresenceStatus } from "@budnet/types";

interface PresenceState {
  presence: Record<string, PresenceStatus>;
  updatePresence: (status: PresenceStatus) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  presence: {},
  updatePresence: (status) =>
    set((state) => ({
      presence: { ...state.presence, [status.userId]: status },
    })),
}));
