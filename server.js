const express = require("express");
const http = require("http");
const crypto = require("crypto");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();
const admins = new Set();
const clients = new Map();

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function broadcast(data) {
  for (const ws of admins) send(ws, data);
}
function snapshot() {
  return [...sessions.values()].map(({ token, ...s }) => s);
}
app.post("/api/link", (_req, res) => {
  const token = crypto.randomBytes(18).toString("hex");
  const expiresAt = Date.now() + 30 * 60 * 1000;
  sessions.set(token, { token, id: token.slice(0, 8), status: "waiting",
    createdAt: Date.now(), expiresAt, device: null, lastSeen: null });
  res.json({ token, url: `/join?token=${token}`, expiresAt });
});
app.get("/api/sessions", (_req, res) => res.json(snapshot()));
app.post("/api/revoke", (req, res) => {
  const { token } = req.body || {};
  const s = sessions.get(token);
  if (!s) return res.status(404).json({ error: "Session not found" });
  sessions.delete(token);
  const client = clients.get(token);
  if (client) { send(client, { type: "revoked" }); client.close(); clients.delete(token); }
  broadcast({ type: "sessions", sessions: snapshot() });
  res.json({ ok: true });
});
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/admin") {
    admins.add(ws);
    send(ws, { type: "sessions", sessions: snapshot() });
    ws.on("close", () => admins.delete(ws));
    return;
  }
  if (url.pathname !== "/device") return ws.close();
  const token = url.searchParams.get("token");
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    send(ws, { type: "error", message: "Invalid or expired pairing link" });
    return ws.close();
  }
  clients.set(token, ws);
  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "consent" && msg.accepted === true) {
      session.status = "connected";
      session.device = {
        userAgent: String(msg.device?.userAgent || "").slice(0, 240),
        platform: String(msg.device?.platform || "").slice(0, 100),
        screen: String(msg.device?.screen || "").slice(0, 50)
      };
      session.lastSeen = Date.now();
    } else if (msg.type === "heartbeat") {
      session.lastSeen = Date.now();
      if (msg.metrics) session.metrics = {
        downlink: String(msg.metrics.downlink || "unknown").slice(0, 30),
        effectiveType: String(msg.metrics.effectiveType || "unknown").slice(0, 30)
      };
    }
    broadcast({ type: "sessions", sessions: snapshot() });
  });
  ws.on("close", () => {
    if (clients.get(token) === ws) clients.delete(token);
    if (sessions.has(token)) {
      session.status = "disconnected";
      broadcast({ type: "sessions", sessions: snapshot() });
    }
  });
});
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (s.expiresAt < now) {
      sessions.delete(token);
      const c = clients.get(token);
      if (c) { send(c, { type: "revoked" }); c.close(); clients.delete(token); }
    }
  }
}, 30_000);
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`ARAL running at http://localhost:${port}`));