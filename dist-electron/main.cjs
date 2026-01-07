import D from "electron";
import L from "electron-updater";
import H from "path";
import F from "http";
import U from "url";
import W from "https";
var oe = {};
const { app: n, BrowserWindow: k, Menu: P, shell: O, protocol: j, ipcMain: u } = D, { autoUpdater: p } = L, f = H, { createServer: q } = F, { parse: M } = U, V = n.requestSingleInstanceLock();
V ? n.on("second-instance", () => {
  t && (t.isMinimized() && t.restore(), t.focus());
}) : n.quit();
const w = process.env.VITE_DEV_SERVER_URL, z = process.env.DIST;
let t, d = null;
const g = 5e3;
p.checkForUpdatesAndNotify();
function $() {
  d || (d = q((e, o) => {
    const r = M(e.url, !0), a = r.pathname, s = r.query;
    if (a === "/oauth-data" && e.method === "POST") {
      let i = "";
      e.on("data", (l) => {
        i += l.toString();
      }), e.on("end", () => {
        try {
          const l = JSON.parse(i);
          console.log("Received OAuth data from callback page:", l), t && t.webContents.send("oauth-callback", l), o.writeHead(200, { "Content-Type": "application/json" }), o.end(JSON.stringify({ success: !0 }));
        } catch (l) {
          console.error("Error parsing OAuth data:", l), o.writeHead(400, { "Content-Type": "application/json" }), o.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }
    if (a.includes("-callback")) {
      const i = a.replace("/-callback", "").replace("/", "");
      if (o.setHeader("Access-Control-Allow-Origin", "*"), o.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"), o.setHeader("Access-Control-Allow-Headers", "Content-Type"), e.method === "OPTIONS") {
        o.writeHead(200), o.end();
        return;
      }
      o.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }), o.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>OAuth Success</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #4CAF50; }
            .error { color: #f44336; }
          </style>
        </head>
        <body>
          <h2 class="success">&#10003; Authentication Successful!</h2>
          <p>You can close this window and return to SiteWeave.</p>
          <script>
            // Extract hash parameters and send to main window
            if (window.location.hash) {
              const hash = window.location.hash.substring(1);
              console.log('OAuth hash received:', hash);
              
              // Send the hash data back to the server to forward to main window
              fetch('/oauth-data', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  provider: 'supabase',
                  hash: hash,
                  url: window.location.href
                })
              }).then(() => {
                console.log('OAuth data sent to server');
              }).catch((error) => {
                console.error('Failed to send OAuth data:', error);
              });
            } else {
              console.log('No hash found in URL:', window.location.href);
            }
            
            setTimeout(() => {
              window.close();
            }, 2000);
          <\/script>
        </body>
        </html>
      `), t && t.webContents.send("oauth-callback", {
        provider: i,
        code: s.code,
        state: s.state,
        error: s.error,
        errorDescription: s.error_description,
        url: e.url,
        fullUrl: `http://127.0.0.1:${g}${e.url}`,
        hash: null
        // Will be extracted client-side
      });
    } else
      o.writeHead(404, { "Content-Type": "text/plain" }), o.end("Not Found");
  }), d.listen(g, "127.0.0.1", () => {
    console.log(`OAuth server listening on http://127.0.0.1:${g}`);
  }), d.on("error", (e) => {
    e.code === "EADDRINUSE" ? console.log(`Port ${g} is already in use`) : console.error("OAuth server error:", e);
  }));
}
function C() {
  d && (d.close(), d = null, console.log("OAuth server stopped"));
}
const S = "siteweave";
function E() {
  if (console.log("Creating window..."), t = new k({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      enableRemoteModule: !1,
      // Enable webSecurity when loading from HTTP (dev server)
      // In production with file:// protocol, webSecurity may need to be disabled
      // but Content Security Policy in index.html provides protection
      webSecurity: !!w,
      preload: f.join(__dirname, "preload.js")
    },
    icon: n.isPackaged ? f.join(process.resourcesPath, "app.asar", "build", "icon.png") : f.join(__dirname, "../build/icon.png"),
    title: "SiteWeave",
    show: !1,
    // Don't show until ready
    titleBarStyle: "default"
  }), console.log("Window created, loading app..."), w)
    console.log("Loading from Vite dev server:", w), t.loadURL(w), t.webContents.openDevTools();
  else {
    const e = n.isPackaged ? f.join(process.resourcesPath, "app.asar", "dist", "index.html") : f.join(z || "dist", "index.html");
    console.log("Loading from production build:", e), t.loadFile(e);
  }
  t.once("ready-to-show", () => {
    console.log("Window ready to show"), t.show(), t.focus();
  }), t.webContents.on("did-fail-load", (e, o, r) => {
    console.error("Failed to load:", o, r), t.show(), t.focus();
  }), t.on("closed", () => {
    console.log("Main window was closed"), t = null;
  }), t.webContents.setWindowOpenHandler(({ url: e }) => (O.openExternal(e), { action: "deny" })), t.webContents.on("will-navigate", (e, o) => {
    const r = new URL(o);
    w ? r.origin !== "http://localhost:5173" && r.origin !== "file://" && (e.preventDefault(), O.openExternal(o)) : r.origin !== "file://" && (e.preventDefault(), O.openExternal(o));
  });
}
function J() {
  const e = [
    {
      label: "File",
      submenu: [
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            t.webContents.send("menu-new-project");
          }
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            n.quit();
          }
        }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About SiteWeave",
          click: () => {
            t.webContents.send("menu-about");
          }
        },
        {
          label: "Check for Updates",
          click: () => {
            p.checkForUpdatesAndNotify();
          }
        }
      ]
    }
  ], o = P.buildFromTemplate(e);
  P.setApplicationMenu(o);
}
function B() {
  j.registerSchemesAsPrivileged([
    {
      scheme: S,
      privileges: {
        standard: !0,
        secure: !0,
        allowServiceWorkers: !0,
        supportFetchAPI: !0,
        corsEnabled: !0
      }
    }
  ]);
}
function R(e) {
  if (!t) return;
  const o = new URL(e), r = o.pathname;
  t.webContents.send("oauth-callback", {
    provider: r.replace("/", ""),
    code: o.searchParams.get("code"),
    state: o.searchParams.get("state"),
    error: o.searchParams.get("error"),
    errorDescription: o.searchParams.get("error_description")
  });
}
B();
n.whenReady().then(() => {
  console.log("App is ready"), k.getAllWindows().length === 0 ? (console.log("No windows exist, creating new window..."), E(), J(), $()) : console.log("Windows already exist, skipping window creation"), n.on("open-url", (e, o) => {
    e.preventDefault(), R(o);
  }), n.on("activate", () => {
    console.log("App activated"), k.getAllWindows().length === 0 && (console.log("No windows on activate, creating new window"), E());
  });
});
n.on("window-all-closed", () => {
  console.log("All windows closed event triggered"), C(), process.platform !== "darwin" && n.quit();
});
n.on("before-quit", () => {
  C();
});
p.on("update-available", () => {
  t == null || t.webContents.send("update-available");
});
p.on("update-downloaded", () => {
  t == null || t.webContents.send("update-downloaded");
});
p.on("error", (e) => {
  if (e.message && (e.message.includes("latest.yml") || e.message.includes("404"))) {
    console.log("Update check: No release artifacts found (this is normal for new releases)", e.message);
    return;
  }
  console.error("Auto-updater error:", e.message || e);
});
u.handle("get-app-version", () => n.getVersion());
u.handle("install-update", () => {
  p.quitAndInstall();
});
u.handle("check-for-updates", async () => {
  try {
    const e = await p.checkForUpdates();
    return {
      success: !0,
      updateInfo: e != null && e.updateInfo ? {
        version: e.updateInfo.version,
        releaseDate: e.updateInfo.releaseDate,
        path: e.updateInfo.path
      } : null
    };
  } catch (e) {
    return {
      success: !1,
      error: e.message || String(e)
    };
  }
});
u.handle("start-oauth-server", () => ($(), !0));
u.handle("stop-oauth-server", () => (C(), !0));
u.handle("send-oauth-callback", (e, o) => (console.log("Received OAuth callback from renderer:", o), t && t.webContents.send("oauth-callback", o), !0));
u.handle("exchange-oauth-token", async (e, { provider: o, code: r, clientId: a, redirectUri: s, codeVerifier: i }) => {
  const l = W, { URL: _, URLSearchParams: x } = U, T = {
    google: "https://oauth2.googleapis.com/token",
    microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token"
  }[o];
  if (!T)
    throw new Error(`Unknown OAuth provider: ${o}`);
  return new Promise((I, m) => {
    const b = new x({
      client_id: a,
      code: r,
      grant_type: "authorization_code",
      redirect_uri: s
    });
    o === "microsoft" && i && b.set("code_verifier", i);
    const v = new _(T), N = {
      hostname: v.hostname,
      port: v.port || 443,
      path: v.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(b.toString())
      }
    }, y = l.request(N, (c) => {
      let A = "";
      c.on("data", (h) => {
        A += h;
      }), c.on("end", () => {
        if (c.statusCode >= 200 && c.statusCode < 300)
          try {
            const h = JSON.parse(A);
            I(h);
          } catch (h) {
            m(new Error(`Failed to parse token response: ${h.message}`));
          }
        else
          m(new Error(`Token exchange failed (${c.statusCode}): ${A}`));
      });
    });
    y.on("error", (c) => {
      m(new Error(`Token exchange request failed: ${c.message}`));
    }), y.write(b.toString()), y.end();
  });
});
process.platform === "win32" && (n.setAsDefaultProtocolClient(S), n.on("second-instance", (e, o, r) => {
  const a = o.find((s) => s.startsWith(`${S}://`));
  a && R(a), t && (t.isMinimized() && t.restore(), t.focus());
}));
export {
  oe as default
};
