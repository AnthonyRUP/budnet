import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("budnet", {
  platform: process.platform,
});
