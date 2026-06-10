import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "@budnet/store";
import { authClient } from "../lib/auth-client";

function ProfileBar() {
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div ref={ref} className="relative border-t border-white/10 p-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-white/10 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
          {user?.image
            ? <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate leading-tight">{user?.name || "User"}</p>
          <p className="text-xs text-white/40 truncate leading-tight">{user?.email}</p>
        </div>
        <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold mb-2 overflow-hidden">
              {user?.image
                ? <img src={user.image} alt={user.name ?? ""} className="w-full h-full object-cover" />
                : initials}
            </div>
            <p className="font-semibold text-gray-900 text-sm">{user?.name || "User"}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          </div>
          <div className="py-1">
            <button
              disabled
              className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Edit profile
              <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">soon</span>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
      <ProfileBar />
    </aside>
  );
}
