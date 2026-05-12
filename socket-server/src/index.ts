import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { verifyClerkToken } from "./middleware/auth";

const app = express();
const httpServer = createServer(app);

const NEXT_APP_URL = process.env.NEXT_APP_URL ?? "http://localhost:3000";
const SOCKET_SERVER_SECRET = process.env.SOCKET_SERVER_SECRET ?? "";
const PORT = process.env.PORT ?? 3001;

// ─── Socket.io Server ────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: NEXT_APP_URL,
    credentials: true,
  },
});

// ─── Authentication Middleware ────────────────────────────────────────────────
// Every connecting client must provide a valid Clerk session token.

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error("Authentication required: no token provided"));
  }

  const payload = await verifyClerkToken(token);
  if (!payload) {
    return next(new Error("Authentication failed: invalid or expired token"));
  }

  // Attach org context to the socket for use in connection handler
  socket.data.organizationId = payload.organizationId;
  socket.data.userId = payload.userId;
  next();
});

// ─── Connection Handler ───────────────────────────────────────────────────────

io.on("connection", (socket) => {
  const orgId = socket.data.organizationId as string;

  // Join the organization's room — all events are scoped to this room
  socket.join(orgId);

  console.log(
    `[Socket] Client connected: userId=${socket.data.userId} org=${orgId} socketId=${socket.id}`
  );

  socket.on("disconnect", (reason) => {
    console.log(
      `[Socket] Client disconnected: socketId=${socket.id} reason=${reason}`
    );
  });
});

// ─── Internal Emit Endpoint ───────────────────────────────────────────────────
// Called by the Next.js app (webhook handler, agent reply endpoint) to
// broadcast events to connected dashboard clients.
// Protected by a shared secret — never expose this endpoint publicly.

app.use(express.json());

app.post("/emit", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!SOCKET_SERVER_SECRET || authHeader !== `Bearer ${SOCKET_SERVER_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { room, event, data } = req.body as {
    room: string;
    event: string;
    data: unknown;
  };

  if (!room || !event) {
    return res.status(400).json({ error: "Missing room or event" });
  }

  io.to(room).emit(event, data);
  console.log(`[Socket] Emitted '${event}' to room '${room}'`);

  return res.json({ ok: true });
});

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[Socket] Server running on port ${PORT}`);
  console.log(`[Socket] Accepting connections from: ${NEXT_APP_URL}`);
});
