import { app as o, BrowserWindow as l } from "electron";
import t from "path";
import { fileURLToPath as s } from "url";
const d = s(import.meta.url), n = t.dirname(d), c = process.env.NODE_ENV === "development";
function i() {
  const e = new l({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      enableRemoteModule: !1,
      webSecurity: !0
    },
    icon: t.join(n, "../public/vite.svg"),
    title: "SiteWeave"
  });
  c ? (e.loadURL("http://localhost:5173"), e.webContents.openDevTools()) : e.loadFile(t.join(n, "../dist/index.html")), e.on("closed", () => {
  });
}
o.whenReady().then(() => {
  i(), o.on("activate", () => {
    l.getAllWindows().length === 0 && i();
  });
});
o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
});
o.on("web-contents-created", (e, a) => {
  a.on("new-window", (r, w) => {
    r.preventDefault();
  });
});
