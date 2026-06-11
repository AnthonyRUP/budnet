import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useWorkspaceStore, type DmConversation } from "@budnet/store";
import { authClient } from "../lib/auth-client";
import { trpc } from "@budnet/api";
import { CreateChannelModal } from "./CreateChannelModal";
import { InviteModal } from "./InviteModal";
import { EditProfileModal } from "./EditProfileModal";
import { NewDmModal } from "./NewDmModal";
import { NotificationBell } from "./NotificationBell";
import { PresenceDot } from "./PresenceDot";

function ProfileBar() {
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
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
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div ref={ref} className="relative border-t border-white/10 p-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-white/10 transition-colors text-left"
        >
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {user?.image
                ? <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
                : initials}
            </div>
            <PresenceDot userId={user?.id} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{displayName}</p>
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
                  ? <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
                  : initials}
              </div>
              <p className="font-semibold text-gray-900 text-sm">{displayName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); setShowEditProfile(true); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Edit profile
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
      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
    </>
  );
}

function DmSection() {
  const { activeWorkspace } = useWorkspaceStore();
  const [showNewDm, setShowNewDm] = useState(false);
  const utils = trpc.useUtils();

  const { data: dms = [] } = trpc.dm.list.useQuery(
    { workspaceId: activeWorkspace?.id ?? "" },
    { enabled: !!activeWorkspace?.id },
  );

  function dmLabel(dm: DmConversation) {
    if (!dm.participants.length) return "Empty DM";
    return dm.participants
      .map((p) => p.name || p.email.split("@")[0])
      .join(", ");
  }

  function dmInitials(dm: DmConversation) {
    const first = dm.participants[0];
    if (!first) return "?";
    const name = first.name || first.email.split("@")[0];
    return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <div className="px-3 py-1 mt-1 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Direct Messages</p>
        <button
          onClick={() => setShowNewDm(true)}
          title="New DM"
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      {dms.map((dm) => (
        <NavLink
          key={dm.channelId}
          to={`/app/channel/${dm.channelId}`}
          className={({ isActive }) =>
            `flex items-center gap-2 px-2 py-1 rounded text-sm ${isActive ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`
          }
        >
          <div className="relative flex-shrink-0">
            <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-white text-[9px] font-bold overflow-hidden">
              {dm.participants[0]?.image
                ? <img src={dm.participants[0].image} alt="" className="w-full h-full object-cover" />
                : dmInitials(dm)}
            </div>
            <PresenceDot userId={dm.participants[0]?.id} className="absolute -bottom-px -right-px w-2 h-2" />
          </div>
          <span className="truncate">{dmLabel(dm)}</span>
        </NavLink>
      ))}
      {showNewDm && <NewDmModal onClose={() => { setShowNewDm(false); utils.dm.list.invalidate(); }} />}
    </div>
  );
}

export function Sidebar() {
  const { activeWorkspace, channels } = useWorkspaceStore();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  return (
    <aside className="w-60 bg-brand-900 text-white flex flex-col">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
        <h1 className="font-bold text-lg truncate">{activeWorkspace?.name ?? "budnet"}</h1>
        <div className="flex items-center gap-1 flex-shrink-0">
          <NotificationBell />
          <button
            onClick={() => setShowInvite(true)}
            title="Invite people"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Channels</p>
            <button
              onClick={() => setShowCreateChannel(true)}
              title="Create channel"
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
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
        <DmSection />
      </nav>
      <ProfileBar />
      {showCreateChannel && <CreateChannelModal onClose={() => setShowCreateChannel(false)} />}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </aside>
  );
}
