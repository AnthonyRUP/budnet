import React, { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";

interface Props {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: Props) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const emailPrefix = user?.email?.split("@")[0] ?? "";
  const [name, setName] = useState(user?.name || emailPrefix);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");

    const result = await authClient.updateUser({ name: trimmed });
    if (result.error) {
      setError(result.error.message ?? "Failed to save");
      setSaving(false);
    } else {
      onClose();
    }
  }

  const initials = (name.trim() || emailPrefix)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 text-gray-900">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Edit profile</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0">
                {user?.image
                  ? <img src={user.image} alt={name} className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Profile photo</p>
                <p className="text-xs text-gray-400 mt-0.5">Photo upload coming soon</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder={emailPrefix}
                required
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                readOnly
                value={user?.email ?? ""}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="px-6 pb-5 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
