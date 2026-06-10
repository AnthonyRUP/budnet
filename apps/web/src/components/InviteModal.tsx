import React, { useEffect, useState } from "react";
import { trpc } from "@budnet/api";
import { useWorkspaceStore } from "@budnet/store";

interface Props {
  onClose: () => void;
}

export function InviteModal({ onClose }: Props) {
  const { activeWorkspace } = useWorkspaceStore();
  const [copied, setCopied] = useState(false);

  const create = trpc.invite.create.useMutation();

  useEffect(() => {
    if (activeWorkspace?.id) create.mutate({ workspaceId: activeWorkspace.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inviteUrl = create.data
    ? `${window.location.origin}/invite/${create.data.token}`
    : null;

  function handleCopy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden text-gray-900">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Invite people</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Share this link to invite people to <span className="font-medium">{activeWorkspace?.name}</span>.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {create.isPending && (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          )}

          {inviteUrl && (
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-700 focus:outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? "bg-green-500 text-white" : "bg-brand-500 hover:bg-brand-600 text-white"}`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-700">
              Anyone with this link can join <span className="font-medium">{activeWorkspace?.name}</span>. Only share it with people you trust.
            </p>
          </div>

          {create.data && (
            <p className="text-xs text-gray-400 text-center">
              Link expires never · Unlimited uses
              <button
                onClick={() => { setCopied(false); create.mutate({ workspaceId: activeWorkspace!.id }); }}
                className="ml-2 underline hover:text-gray-600"
              >
                Generate new link
              </button>
            </p>
          )}
        </div>

        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
