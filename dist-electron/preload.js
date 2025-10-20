import { contextBridge as e } from "electron";
e.exposeInMainWorld("electronAPI", {
  // Add any IPC methods you need here
  // For now, we'll keep it simple since the app works fine without it
});
