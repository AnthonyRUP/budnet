import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Message } from "@budnet/ui/message";
import { trpc } from "@budnet/api";
import { useWorkspaceStore } from "@budnet/store";

function ChannelSettings({ channelId, channelName, channelDescription }: {
  channelId: string;
  channelName: string;
  channelDescription?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(channelName);
  const [description, setDescription] = useState(channelDescription ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { activeWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const update = trpc.channel.update.useMutation({
    onSuccess: () => {
      utils.channel.list.invalidate({ workspaceId: activeWorkspace!.id });
      setEditing(false);
      setOpen(false);
    },
  });

  const del = trpc.channel.delete.useMutation({
    onSuccess: () => {
      utils.channel.list.invalidate({ workspaceId: activeWorkspace!.id });
      navigate("/app", { replace: true });
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!slug) return;
    update.mutate({ channelId, name: slug, description: description.trim() || undefined });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); setEditing(false); setConfirmDelete(false); }}
        title="Channel settings"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden text-gray-900">
          {!editing && !confirmDelete && (
            <>
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="font-semibold text-gray-900 text-sm"># {channelName}</p>
                {channelDescription && <p className="text-xs text-gray-500 mt-0.5">{channelDescription}</p>}
              </div>
              <div className="py-1">
                <button
                  onClick={() => setEditing(true)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit channel
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete channel
                </button>
              </div>
            </>
          )}

          {editing && (
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <p className="font-semibold text-gray-900 text-sm">Edit channel</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">#</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="flex-1 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={update.isPending} className="flex-1 py-1.5 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 disabled:opacity-50">
                  {update.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}

          {confirmDelete && (
            <div className="p-4 space-y-3">
              <p className="font-semibold text-gray-900 text-sm">Delete #{channelName}?</p>
              <p className="text-xs text-gray-500">This will permanently delete the channel and all its messages. This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={() => del.mutate({ channelId })}
                  disabled={del.isPending}
                  className="flex-1 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                >
                  {del.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChannelView() {
  const { channelId } = useParams<{ channelId: string }>();
  const [input, setInput] = useState("");
  const { channels } = useWorkspaceStore();

  const channel = channels.find((c) => c.id === channelId);

  const utils = trpc.useUtils();
  const { data } = trpc.message.list.useQuery(
    { channelId: channelId! },
    { enabled: !!channelId },
  );

  const send = trpc.message.send.useMutation({
    onSuccess: () => {
      utils.message.list.invalidate({ channelId: channelId! });
    },
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !channelId) return;
    send.mutate({ channelId, content: input.trim() });
    setInput("");
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-2.5 border-b flex items-center justify-between">
        <span className="font-semibold text-gray-900"># {channel?.name ?? channelId}</span>
        {channel && (
          <ChannelSettings
            key={channelId}
            channelId={channelId!}
            channelName={channel.name}
            channelDescription={channel.description}
          />
        )}
      </header>
      <div className="flex-1 overflow-y-auto py-2">
        {data?.messages.map((msg) => (
          <Message
            key={msg.id}
            message={msg}
            authorName={msg.authorName || msg.authorEmail?.split("@")[0] || msg.authorId}
            authorAvatar={msg.authorImage ?? undefined}
          />
        ))}
      </div>
      <form onSubmit={handleSend} className="px-4 py-3 border-t">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message #${channel?.name ?? "channel"}`}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          disabled={send.isPending}
        />
      </form>
    </div>
  );
}
