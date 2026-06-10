import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@budnet/api";
import { useWorkspaceStore } from "@budnet/store";

interface Props {
  onClose: () => void;
}

export function NewDmModal({ onClose }: Props) {
  const { activeWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { data: members = [] } = trpc.workspace.members.useQuery(
    { workspaceId: activeWorkspace?.id ?? "" },
    { enabled: !!activeWorkspace?.id },
  );

  const findOrCreate = trpc.dm.findOrCreate.useMutation({
    onSuccess: ({ channelId }) => {
      utils.dm.list.invalidate({ workspaceId: activeWorkspace!.id });
      navigate(`/app/channel/${channelId}`);
      onClose();
    },
  });

  const filtered = members.filter((m) => {
    const name = m.name || m.email.split("@")[0];
    return name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
  });

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleOpen() {
    if (!selected.length || !activeWorkspace) return;
    findOrCreate.mutate({ workspaceId: activeWorkspace.id, memberIds: selected });
  }

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden text-gray-900">
        <div className="px-4 py-3 border-b">
          <h2 className="font-bold text-base">New message</h2>
        </div>

        {/* Selected chips */}
        <div className="px-4 pt-3 flex flex-wrap gap-1.5 min-h-[2.5rem]">
          {selected.map((id) => {
            const m = members.find((x) => x.id === id);
            if (!m) return null;
            const name = m.name || m.email.split("@")[0];
            return (
              <span key={id} className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded-full">
                {name}
                <button onClick={() => toggle(id)} className="hover:text-brand-900">×</button>
              </span>
            );
          })}
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={selected.length ? "" : "Search people…"}
            className="flex-1 min-w-[120px] text-sm outline-none placeholder:text-gray-400 py-1"
          />
        </div>

        {/* Member list */}
        <div className="mt-2 max-h-60 overflow-y-auto border-t">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No members found</p>
          )}
          {filtered.map((m) => {
            const name = m.name || m.email.split("@")[0];
            const isSelected = selected.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left ${isSelected ? "bg-brand-50" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                  {m.image ? <img src={m.image} alt={name} className="w-full h-full object-cover" /> : getInitials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
                {isSelected && (
                  <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t">
          <button
            onClick={handleOpen}
            disabled={!selected.length || findOrCreate.isPending}
            className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
          >
            {findOrCreate.isPending ? "Opening…" : selected.length > 1 ? `Start group DM (${selected.length})` : "Open DM"}
          </button>
        </div>
      </div>
    </div>
  );
}
