import React, { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";

function CameraCapture({ onCapture, onClose }: { onCapture: (blob: Blob) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [captured, setCaptured] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError("Camera access denied. Please allow camera access in your browser."));

    return () => {
      // cleanup handled in the stream state effect below
    };
  }, []);

  useEffect(() => {
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [stream]);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setCaptured(canvas.toDataURL("image/jpeg", 0.92));
  }

  function handleRetake() { setCaptured(null); }

  function handleUse() {
    if (!captured || !canvasRef.current) return;
    canvasRef.current.toBlob((blob) => { if (blob) onCapture(blob); }, "image/jpeg", 0.92);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-4">
        {error ? (
          <div className="p-8 text-center text-white">
            <p className="text-sm">{error}</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-white/20 rounded-lg text-sm">Close</button>
          </div>
        ) : (
          <>
            <div className="relative aspect-square bg-gray-900">
              {!captured && (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
              {captured && (
                <img src={captured} alt="preview" className="w-full h-full object-cover" />
              )}
              {/* Circular crop guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 rounded-full border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2 p-4">
              {!captured ? (
                <>
                  <button onClick={onClose} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">Cancel</button>
                  <button onClick={handleCapture} className="flex-1 py-2.5 bg-white text-black rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100">Take photo</button>
                </>
              ) : (
                <>
                  <button onClick={handleRetake} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">Retake</button>
                  <button onClick={handleUse} className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors">Use photo</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: Props) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const emailPrefix = user?.email?.split("@")[0] ?? "";
  const [name, setName] = useState(user?.name || emailPrefix);
  const [avatarUrl, setAvatarUrl] = useState(user?.image ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const uploadBlob = useCallback(async (blob: Blob, filename = "avatar.jpg") => {
    setAvatarUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", blob, filename);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { url: string };
      setAvatarUrl(data.url);
    } catch {
      setError("Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadBlob(file, file.name);
    e.target.value = "";
  }

  async function handleCameraCapture(blob: Blob) {
    setShowCamera(false);
    await uploadBlob(blob, "avatar.jpg");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");

    const updates: { name: string; image?: string } = { name: trimmed };
    if (avatarUrl !== (user?.image ?? "")) updates.image = avatarUrl || undefined;

    const result = await authClient.updateUser(updates);
    if (result.error) {
      setError(result.error.message ?? "Failed to save");
      setSaving(false);
    } else {
      onClose();
    }
  }

  const displayAvatar = avatarUrl || user?.image;
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
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group w-16 h-16 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                  {displayAvatar
                    ? <img src={displayAvatar} alt={name} className="w-full h-full object-cover" />
                    : initials}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  disabled={avatarUploading}
                  title="Take a photo with your camera"
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-wait"
                >
                  {avatarUploading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                  }
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Profile photo</p>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="text-xs text-brand-500 hover:underline mt-0.5 disabled:opacity-50"
                >
                  {avatarUploading ? "Uploading…" : "Upload new photo"}
                </button>
                {avatarUrl && avatarUrl !== (user?.image ?? "") && (
                  <p className="text-xs text-green-600 mt-0.5">New photo ready — save to apply</p>
                )}
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
              disabled={saving || avatarUploading || !name.trim()}
              className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
}
