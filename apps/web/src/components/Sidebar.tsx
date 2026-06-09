import React from "react";
import { NavLink } from "react-router-dom";
import { useWorkspaceStore } from "@budnet/store";

export function Sidebar() {
  const { activeWorkspace, channels } = useWorkspaceStore();

  return (
    <aside className="w-60 bg-brand-900 text-white flex flex-col">
      <div className="px-4 py-3 border-b border-white/10">
        <h1 className="font-bold text-lg truncate">{activeWorkspace?.name ?? "budnet"}</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-1">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Channels</p>
          {channels.map((ch) => (
            <NavLink
              key={ch.id}
              to={`/app/channel/${ch.id}`}
              className={({ isActive }) =>
                `block px-2 py-1 rounded text-sm ${isActive ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`
              }
            >
              # {ch.name}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}
