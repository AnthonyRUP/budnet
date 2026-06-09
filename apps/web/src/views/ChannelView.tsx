import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Message } from "@budnet/ui/message";
import { trpc } from "@budnet/api";
import { useWorkspaceStore } from "@budnet/store";

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
      <header className="px-4 py-3 border-b font-semibold text-gray-900">
        # {channel?.name ?? channelId}
      </header>
      <div className="flex-1 overflow-y-auto py-2">
        {data?.messages.map((msg) => (
          <Message key={msg.id} message={msg} authorName="User" />
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
