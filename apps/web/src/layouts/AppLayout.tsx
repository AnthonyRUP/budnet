import React, { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { trpc } from "@budnet/api";
import { useWorkspaceStore } from "@budnet/store";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveWorkspace, setChannels, activeWorkspace } = useWorkspaceStore();

  const { data: workspaces, isLoading: loadingWorkspaces } = trpc.workspace.list.useQuery();
  const initWorkspace = trpc.workspace.init.useMutation();

  const { data: channels, isLoading: loadingChannels } = trpc.channel.list.useQuery(
    { workspaceId: activeWorkspace?.id ?? "" },
    { enabled: !!activeWorkspace?.id },
  );

  // Bootstrap: set active workspace or create one
  useEffect(() => {
    if (loadingWorkspaces || initWorkspace.isPending) return;
    if (!workspaces) return;

    if (workspaces.length > 0) {
      setActiveWorkspace(workspaces[0] as Parameters<typeof setActiveWorkspace>[0]);
    } else {
      initWorkspace.mutateAsync().then((ws) => {
        setActiveWorkspace(ws as Parameters<typeof setActiveWorkspace>[0]);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, loadingWorkspaces]);

  // Store channels + redirect to first channel when on bare /app
  useEffect(() => {
    if (!channels) return;
    setChannels(channels as Parameters<typeof setChannels>[0]);
    const isRoot = location.pathname === "/app" || location.pathname === "/app/";
    if (isRoot && channels.length > 0) {
      navigate(`/app/channel/${channels[0].id}`, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, location.pathname]);

  // Stay in loading state until we have both a workspace AND channels loaded.
  // Without !activeWorkspace, there's a window where loadingWorkspaces=false but
  // the store effect hasn't run yet — channel.list is disabled so loadingChannels=false
  // too, making isBooting=false and rendering the layout before channels exist.
  const isBooting = loadingWorkspaces || !activeWorkspace || loadingChannels;

  if (isBooting) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-900">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
