import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@budnet/api";
import { useWorkspaceStore } from "@budnet/store";

interface Props {
  onClose: () => void;
}

export function CreateChannelModal({ onClose }: Props) {
  const { activeWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const create = trpc.channel.create.useMutation({
    onSuccess: (channel) => {
      utils.channel.list.invalidate({ workspaceId: activeWorkspace!.id });
      navigate(`/app/channel/${channel.id}`);
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!slug || !activeWorkspace) return;
    setError("");
    create.mutate({ workspaceId: activeWorkspace.id, name: slug, description: description.trim() || undefined, isPrivate });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden text-gray-900">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Create a channel</h2>
          <p className="text-sm text-gray-500 mt-0.5">Channels are where your team communicates.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">#</span>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. marketing"
                className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            {name && (
              <p className="text-xs text-gray-400 mt-1">
                Will be created as <span className="font-mono">#{name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsPrivate((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${isPrivate ? "bg-brand-500" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPrivate ? "translate-x-4" : ""}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Private channel</p>
              <p className="text-xs text-gray-400">Only invited members can join</p>
            </div>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || create.isPending}
              className="flex-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
