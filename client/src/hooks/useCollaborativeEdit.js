import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";

export const useCollaborativeEdit = (
  snippetId,
  userId,
  initialData,
  context = {}
) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [remoteChanges, setRemoteChanges] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLocallyEditing, setIsLocallyEditing] = useState(false);

  // Simplified debounce and timing references
  const debounceRef = useRef(null);
  const localEditTimeoutRef = useRef(null);
  const syncingTimeoutRef = useRef(null);
  const lastLocalChangeRef = useRef(null);

  useEffect(() => {
    if (!snippetId || !userId) return;

    // Initialize socket connection with stable configuration
    socketRef.current = io("https://snippet-hub-full-stack.onrender.com", {
      withCredentials: true,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 2000, // Increased from 1000
      reconnectionDelayMax: 10000, // Increased from 5000
      reconnectionAttempts: 10, // Increased from 5
      timeout: 30000, // Increased from 20000
      transports: ["websocket", "polling"],
      upgrade: true,
      autoConnect: true,
      // Add ping/pong settings to keep connection alive
      pingTimeout: 60000, // How long to wait for pong
      pingInterval: 25000, // How often to ping
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("WebSocket connected for collaborative editing");
      setIsConnected(true);

      // Rejoin the snippet editing room after reconnection
      socket.emit("join-snippet-edit", { snippetId, userId });
    });

    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      setIsConnected(false);
      setActiveUsers([]);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setIsConnected(false);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("WebSocket reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
      // Rejoin the snippet editing room after reconnection
      socket.emit("join-snippet-edit", { snippetId, userId });
    });

    socket.on("reconnect_error", (error) => {
      console.error("WebSocket reconnection error:", error);
    });

    // Join the snippet editing room
    socket.emit("join-snippet-edit", { snippetId, userId });

    // Add heartbeat mechanism for collaborative editing
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 30000); // Increased from 25000 to reduce frequency

    socket.on("pong", () => {
      console.log("Received collaborative editing pong from server");
    });

    // Listen for other users joining/leaving
    socket.on("user-joined-edit", (data) => {
      console.log("User joined editing:", data.userId);
      setActiveUsers((prev) => {
        if (!prev.find((user) => user.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    socket.on("user-left-edit", (data) => {
      console.log("User left editing:", data.userId);
      setActiveUsers((prev) =>
        prev.filter((user) => user.userId !== data.userId)
      );
    });

    socket.on("active-users-update", (users) => {
      setActiveUsers(users.filter((user) => user.userId !== userId));
    });

    // Listen for real-time content changes - simplified handling
    socket.on("snippet-content-changed", (data) => {
      if (data.userId !== userId) {
        console.log("Received remote change:", {
          field: data.field,
          valueLength: data.value ? data.value.length : 0,
          timestamp: data.timestamp,
          userId: data.userId,
        });

        // Simple approach: directly apply remote changes
        const lastLocalTime = lastLocalChangeRef.current || 0;
        const timeSinceLocal = Date.now() - lastLocalTime;

        // Only apply if it's not our own change and enough time has passed
        if (timeSinceLocal > 300) {
          // Increased from 100 for better stability
          setRemoteChanges(data);

          // Brief syncing indicator
          setIsSyncing(true);
          if (syncingTimeoutRef.current) {
            clearTimeout(syncingTimeoutRef.current);
          }
          syncingTimeoutRef.current = setTimeout(() => {
            setIsSyncing(false);
          }, 100);
        } else {
          console.log("Skipping remote change due to recent local activity");
        }
      }
    });

    // Listen for cursor position updates
    socket.on("cursor-position-changed", (data) => {
      if (data.userId !== userId) {
        setActiveUsers((prev) =>
          prev.map((user) =>
            user.userId === data.userId
              ? { ...user, cursorPosition: data.position, field: data.field }
              : user
          )
        );
      }
    });

    // Cleanup on unmount
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      socket.emit("leave-snippet-edit", { snippetId, userId });
      socket.disconnect();

      // Clear all timeouts
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (localEditTimeoutRef.current)
        clearTimeout(localEditTimeoutRef.current);
      if (syncingTimeoutRef.current) clearTimeout(syncingTimeoutRef.current);
    };
  }, [snippetId, userId]); // Only depend on stable values

  // Simplified content change sending
  const sendContentChange = useCallback(
    (field, value, cursorPosition = null) => {
      if (!socketRef.current || !isConnected) return;

      // Mark as locally editing immediately
      setIsLocallyEditing(true);

      // Record the timestamp of this local change
      const timestamp = Date.now();
      lastLocalChangeRef.current = timestamp;

      // Clear previous timeouts
      if (localEditTimeoutRef.current) {
        clearTimeout(localEditTimeoutRef.current);
      }

      // Shorter local editing timeout for faster sync
      const timeoutDuration = 300;
      localEditTimeoutRef.current = setTimeout(() => {
        setIsLocallyEditing(false);
      }, timeoutDuration);

      // Clear previous debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Minimal debouncing for smoother updates
      const debounceDuration = 300; // Increased from 100 to reduce frequency
      debounceRef.current = setTimeout(() => {
        if (socketRef.current && socketRef.current.connected) {
          console.log("Sending content change:", {
            field,
            valueLength: value ? value.length : 0,
            timestamp,
          });

          socketRef.current.emit("snippet-content-change", {
            snippetId,
            userId,
            field,
            value,
            cursorPosition,
            timestamp,
            context: context.isCollectionContext ? "collection" : "personal",
          });
        }
      }, debounceDuration);
    },
    [snippetId, userId, isConnected, context.isCollectionContext]
  );

  // Send cursor position updates
  const sendCursorPosition = useCallback(
    (field, position) => {
      if (!socketRef.current || !isConnected) return;

      socketRef.current.emit("cursor-position-change", {
        snippetId,
        userId,
        field,
        position,
        timestamp: Date.now(),
      });
    },
    [snippetId, userId, isConnected]
  );

  // Send immediate save to sync all users
  const sendSave = useCallback(
    (updatedData) => {
      if (!socketRef.current || !isConnected) return;

      socketRef.current.emit("snippet-saved", {
        snippetId,
        userId,
        data: updatedData,
        timestamp: Date.now(),
      });
    },
    [snippetId, userId, isConnected]
  );

  return {
    isConnected,
    activeUsers,
    remoteChanges,
    isSyncing: isSyncing && (!isLocallyEditing || !context.isCollectionContext),
    isLocallyEditing,
    sendContentChange,
    sendCursorPosition,
    sendSave,
    socket: socketRef.current, // Expose socket for debugging
  };
};
