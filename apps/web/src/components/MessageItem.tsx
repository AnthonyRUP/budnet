import React, { useEffect, useRef, useState } from "react";
import { trpc } from "@budnet/api";

const QUICK_EMOJIS = ["👍", "👎", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👀", "🙌", "💯", "🤔", "😅", "🥳", "🙏", "✅", "👏", "💪", "🤣", "😍", "⚡", "💡", "🎯", "💀"];

interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
}

interface MessageData {
  id: string;
  content: string;
  authorId: string;
  authorName?: string | null;
  authorEmail?: string | null;
  authorImage?: string | null;
  createdAt: Date | string;
  editedAt?: Date | string | null;
  channelId: string;
  reactions?: Reaction[];
}

interface Props {
  message: MessageData;
  currentUserId?: string;
  onInvalidate: () => void;
}

export function MessageItem({ message, currentUserId, onInvalidate }: Props) {
  const [hovering, setHovering] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const isOwn = currentUserId === message.authorId;

  const authorName = message.authorName || message.authorEmail?.split("@")[0] || "User";
  const initials = authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const update = trpc.message.update.useMutation({
    onSuccess: () => { onInvalidate(); setEditing(false); },
  });

  const del = trpc.message.delete.useMutation({
    onSuccess: () => { onInvalidate(); },
  });

  useEffect(() => {
    if (editing) {
      setEditContent(message.content);
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [editing, message.content]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setEditing(false);
        setConfirmDelete(false);
        setShowPicker(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!showPicker) return;
    function onMouseDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showPicker]);

  const react = trpc.message.react.useMutation({
    onSuccess: () => onInvalidate(),
  });

  function handleReact(emoji: string) {
    react.mutate({ messageId: message.id, channelId: message.channelId, emoji });
    setShowPicker(false);
  }

  const reactions = message.reactions ?? [];

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editContent.trim()) return;
    update.mutate({ messageId: message.id, content: editContent.trim() });
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editContent.trim()) {
        update.mutate({ messageId: message.id, content: editContent.trim() });
      }
    }
  }

  return (
    <div
      className="relative flex gap-3 px-4 py-1 hover:bg-gray-50 group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 overflow-hidden">
        {message.authorImage
          ? <img src={message.authorImage} alt={authorName} className="w-full h-full object-cover" />
          : initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-gray-900">{authorName}</span>
          <span className="text-xs text-gray-400">{time}</span>
          {message.editedAt && !editing && (
            <span className="text-xs text-gray-400 italic">(edited)</span>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSaveEdit} className="mt-1">
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full px-3 py-2 border border-brand-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={Math.min(6, editContent.split("\n").length + 1)}
            />
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-400">Enter to save · Esc to cancel</span>
              <div className="ml-auto flex gap-1.5">
                <button type="button" onClick={() => setEditing(false)} className="px-2.5 py-1 text-xs border rounded-md text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={update.isPending || !editContent.trim()} className="px-2.5 py-1 text-xs bg-brand-500 text-white rounded-md hover:bg-brand-600 disabled:opacity-50">
                  {update.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </form>
        ) : confirmDelete ? (
          <div className="mt-1 inline-flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
            <span className="text-xs text-red-700">Delete this message?</span>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
            <button
              onClick={() => del.mutate({ messageId: message.id })}
              disabled={del.isPending}
              className="text-xs text-red-600 font-medium hover:text-red-800 disabled:opacity-50"
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Reaction chips */}
        {reactions.length > 0 && !editing && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactions.map((r) => {
              const reacted = r.userIds.includes(currentUserId ?? "");
              return (
                <button
                  key={r.emoji}
                  onClick={() => handleReact(r.emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    reacted
                      ? "bg-brand-100 border-brand-300 text-brand-700"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="font-medium">{r.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      {hovering && !editing && !confirmDelete && (
        <div className="absolute right-4 -top-3 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5">
          {/* Emoji reaction — visible to everyone */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowPicker((v) => !v)}
              title="Add reaction"
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-sm leading-none"
            >
              😊
            </button>
            {showPicker && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 w-52">
                <div className="grid grid-cols-6 gap-0.5">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Edit + delete — own messages only */}
          {isOwn && (
            <>
              <button
                onClick={() => setEditing(true)}
                title="Edit"
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete"
                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
