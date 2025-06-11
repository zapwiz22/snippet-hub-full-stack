import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import connectToMongoDB from "./db/db.js";
import authRoutes from "./routes/auth.routes.js";
import snippetRoutes from "./routes/snippet.routes.js";
import collectionRoutes from "./routes/collection.routes.js";
import User from "./models/user.model.js";
import { connectRedis } from "./db/redis.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://snippet-hub-full-stack.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Enhanced connection settings
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 30000, // 30 seconds
  allowEIO3: true,
  transports: ["websocket", "polling"],
  allowUpgrades: true,
  cookie: false,
  serveClient: false,
  // Connection state recovery
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
});

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "https://snippet-hub-full-stack.vercel.app", // frontend url
    credentials: true, // to allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.use(express.json());
app.use(cookieParser());

app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/snippet", snippetRoutes);
app.use("/api/collection", collectionRoutes);

const activeEditingSessions = new Map();

// Cleanup function for stale sessions
const cleanupStaleSessions = () => {
  const now = Date.now();
  const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  for (const [snippetId, users] of activeEditingSessions.entries()) {
    for (const [userId, userInfo] of users.entries()) {
      if (now - new Date(userInfo.joinedAt).getTime() > STALE_THRESHOLD) {
        console.log(
          `Cleaning up stale session for user ${userId} in snippet ${snippetId}`
        );
        users.delete(userId);
      }
    }

    if (users.size === 0) {
      activeEditingSessions.delete(snippetId);
    }
  }
};

// Run cleanup every 2 minutes
setInterval(cleanupStaleSessions, 2 * 60 * 1000);

// web socket connection building and stuff
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-collection", (collectionId) => {
    console.log(`User ${socket.id} joined collection ${collectionId}`);
    socket.join(`collection-${collectionId}`);
  });

  socket.on("leave-collection", (collectionId) => {
    console.log(`User ${socket.id} left collection ${collectionId}`);
    socket.leave(`collection-${collectionId}`);
  });

  socket.on("join-snippet-edit", async (data) => {
    const { snippetId, userId } = data;
    const roomName = `snippet-edit-${snippetId}`;

    console.log(`User ${userId} joined snippet editing ${snippetId}`);
    socket.join(roomName);

    try {
      const user = await User.findById(userId).select("username email");

      socket.userId = userId;
      socket.snippetId = snippetId;

      if (!activeEditingSessions.has(snippetId)) {
        activeEditingSessions.set(snippetId, new Map());
      }

      const userInfo = {
        socketId: socket.id,
        userId,
        username: user ? user.username : `User${userId.slice(-4)}`,
        email: user ? user.email : null,
        joinedAt: new Date(),
      };

      activeEditingSessions.get(snippetId).set(userId, userInfo);

      socket.to(roomName).emit("user-joined-edit", userInfo);

      const activeUsers = Array.from(
        activeEditingSessions.get(snippetId).values()
      );
      socket.emit("active-users-update", activeUsers);
    } catch (error) {
      console.error("Error fetching user details:", error);
      socket.userId = userId;
      socket.snippetId = snippetId;

      if (!activeEditingSessions.has(snippetId)) {
        activeEditingSessions.set(snippetId, new Map());
      }

      const fallbackUserInfo = {
        socketId: socket.id,
        userId,
        username: `User${userId.slice(-4)}`,
        email: null,
        joinedAt: new Date(),
      };

      activeEditingSessions.get(snippetId).set(userId, fallbackUserInfo);
      socket.to(roomName).emit("user-joined-edit", fallbackUserInfo);

      const activeUsers = Array.from(
        activeEditingSessions.get(snippetId).values()
      );
      socket.emit("active-users-update", activeUsers);
    }
  });

  socket.on("leave-snippet-edit", (data) => {
    const { snippetId, userId } = data;
    const roomName = `snippet-edit-${snippetId}`;

    console.log(`User ${userId} left snippet editing ${snippetId}`);
    socket.leave(roomName);

    if (activeEditingSessions.has(snippetId)) {
      activeEditingSessions.get(snippetId).delete(userId);
      if (activeEditingSessions.get(snippetId).size === 0) {
        activeEditingSessions.delete(snippetId);
      }
    }

    socket.to(roomName).emit("user-left-edit", {
      userId,
      username: activeEditingSessions.get(snippetId)?.get(userId)?.username,
    });
  });

  socket.on("snippet-content-change", (data) => {
    const {
      snippetId,
      userId,
      field,
      value,
      cursorPosition,
      timestamp,
      context,
    } = data;
    const roomName = `snippet-edit-${snippetId}`;

    const enhancedData = {
      userId,
      field,
      value,
      cursorPosition,
      timestamp: timestamp || Date.now(),
      context: context || "personal",
      messageId: `${userId}-${field}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`, // More unique ID
    };

    // Broadcast immediately without any filtering
    socket.to(roomName).emit("snippet-content-changed", enhancedData);

    console.log(`Content change in ${context} context:`, {
      snippetId,
      userId,
      field,
      valueLength: value ? value.length : 0,
      timestamp: enhancedData.timestamp,
    });
  });

  socket.on("cursor-position-change", (data) => {
    const { snippetId, userId, field, position, timestamp } = data;
    const roomName = `snippet-edit-${snippetId}`;

    socket.to(roomName).emit("cursor-position-changed", {
      userId,
      field,
      position,
      timestamp,
    });
  });

  socket.on("snippet-saved", (data) => {
    const { snippetId, userId, data: snippetData, timestamp } = data;
    const roomName = `snippet-edit-${snippetId}`;

    socket.to(roomName).emit("snippet-saved-by-user", {
      userId,
      data: snippetData,
      timestamp,
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("User disconnected:", socket.id, "Reason:", reason);

    if (socket.userId && socket.snippetId) {
      const snippetId = socket.snippetId;
      const userId = socket.userId;
      const roomName = `snippet-edit-${snippetId}`;

      if (activeEditingSessions.has(snippetId)) {
        activeEditingSessions.get(snippetId).delete(userId);
        if (activeEditingSessions.get(snippetId).size === 0) {
          activeEditingSessions.delete(snippetId);
        }
      }

      socket.to(roomName).emit("user-left-edit", { userId });
    }

    // Clean up any collection rooms the socket was in
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => {
      if (room.startsWith("collection-")) {
        socket.to(room).emit("user-disconnected", { socketId: socket.id });
      }
    });
  });

  // Add heartbeat mechanism
  socket.on("ping", () => {
    socket.emit("pong");
  });

  // Handle connection errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

server.listen(PORT, () => {
  connectToMongoDB();
  connectRedis();
  console.log(`Server Running on port ${PORT}`);
});
