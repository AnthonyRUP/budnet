import React, { useRef, useState } from "react";
import { trpc } from "@budnet/api";
import { useWorkspaceStore } from "@budnet/store";

interface UploadedFile {
  tempId: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface Props {
  placeholder: string;
  onSend: (
    content: string,
    attachments: Omit<UploadedFile, "tempId" | "previewUrl" | "status" | "error">[],
    mentionedUserIds: string[],
  ) => void;
  disabled?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageInput({ placeholder, onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { activeWorkspace } = useWorkspaceStore();
  const { data: members = [] } = trpc.workspace.members.useQuery(
    { workspaceId: activeWorkspace?.id ?? "" },
    { enabled: !!activeWorkspace?.id && mentionQuery !== null },
  );

  const filteredMembers = mentionQuery !== null
    ? members.filter((m) => {
        const name = m.name || m.email.split("@")[0];
        return name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(mentionQuery.toLowerCase());
      }).slice(0, 6)
    : [];

  async function uploadFile(file: File): Promise<UploadedFile> {
    const tempId = Math.random().toString(36).slice(2);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    const pending: UploadedFile = { tempId, url: "", filename: file.name, mimeType: file.type, size: file.size, previewUrl, status: "uploading" };
    setFiles((prev) => [...prev, pending]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { url: string; filename: string; mimeType: string; size: number };
      const done: UploadedFile = { ...pending, ...data, status: "done" };
      setFiles((prev) => prev.map((f) => (f.tempId === tempId ? done : f)));
      return done;
    } catch {
      const failed: UploadedFile = { ...pending, status: "error", error: "Upload failed" };
      setFiles((prev) => prev.map((f) => (f.tempId === tempId ? failed : f)));
      return failed;
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of selected) await uploadFile(file);
  }

  function removeFile(tempId: string) {
    setFiles((prev) => {
      const f = prev.find((x) => x.tempId === tempId);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.tempId !== tempId);
    });
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@([\w\s]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function selectMention(member: { id: string; name: string | null; email: string }) {
    const displayName = member.name || member.email.split("@")[0];
    const newText = text.replace(/@([\w\s]*)$/, `@${displayName} `);
    setText(newText);
    setMentionedIds((prev) => [...new Set([...prev, member.id])]);
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const doneFiles = files.filter((f) => f.status === "done");
    if (!text.trim() && !doneFiles.length) return;
    onSend(
      text.trim(),
      doneFiles.map(({ url, filename, mimeType, size }) => ({ url, filename, mimeType, size })),
      mentionedIds,
    );
    setText("");
    setFiles([]);
    setMentionedIds([]);
    setMentionQuery(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && mentionQuery !== null) {
      setMentionQuery(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  const uploading = files.some((f) => f.status === "uploading");

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-t relative">
      {/* Mention autocomplete */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-10">
          {filteredMembers.map((m) => {
            const name = m.name || m.email.split("@")[0];
            return (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectMention(m); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden">
                  {m.image ? <img src={m.image} alt={name} className="w-full h-full object-cover" /> : getInitials(name)}
                </div>
                <span className="text-sm font-medium text-gray-800">{name}</span>
                <span className="text-xs text-gray-400 ml-auto">{m.email}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Pending attachment previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((f) => (
            <div key={f.tempId} className="relative group">
              {f.previewUrl ? (
                <div className="w-20 h-20 rounded-lg overflow-hidden border bg-gray-50 flex items-center justify-center">
                  <img src={f.previewUrl} alt={f.filename} className="w-full h-full object-cover" />
                  {f.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 text-sm max-w-[180px]">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{f.filename}</p>
                    <p className="text-xs text-gray-400">{f.status === "uploading" ? "Uploading…" : f.status === "error" ? f.error : formatBytes(f.size)}</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(f.tempId)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >×</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          disabled={disabled || uploading}
        />
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" />
      </div>
    </form>
  );
}
