import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@budnet/api";

function timeAgo(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: unreadCount = 0 } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 15000, // poll every 15s
  });

  const { data: notifications = [] } = trpc.notification.list.useQuery(
    { limit: 20 },
    { enabled: open },
  );

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      // Mark all read when opening
      markRead.mutate({});
    }
  }

  function handleClick(notification: typeof notifications[number]) {
    setOpen(false);
    navigate(`/app/channel/${notification.channelId}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        title="Notifications"
        className="relative w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm">Mentions</p>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={() => markRead.mutate({})}
                className="text-xs text-brand-500 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">No mentions yet</p>
            ) : (
              notifications.map((n) => {
                const senderName = n.senderName || n.senderEmail?.split("@")[0] || "Someone";
                const senderInitials = senderName.split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 ${!n.read ? "bg-brand-50/50" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 overflow-hidden">
                      {n.senderImage
                        ? <img src={n.senderImage} alt={senderName} className="w-full h-full object-cover" />
                        : senderInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-900">{senderName}</span>
                        <span className="text-xs text-gray-400">mentioned you in</span>
                        <span className="text-xs font-medium text-gray-600">#{n.channelName ?? "channel"}</span>
                        {!n.read && <span className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0" />}
                      </div>
                      {n.messageContent && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.messageContent}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
