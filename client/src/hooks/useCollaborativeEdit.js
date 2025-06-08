import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";
import { createChangeQueue } from "../utils/textDiff";

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

  // Enhanced debounce and timing references
  const debounceRef = useRef(null);
  const localEditTimeoutRef = useRef(null);
  const syncingTimeoutRef = useRef(null);
  const lastLocalChangeRef = useRef(null);
  const pendingChangesQueue = useRef([]);
  const processingRemoteChange = useRef(false);
  const changeQueueRef = useRef(null);

  useEffect(() => {
    if (!snippetId || !userId) return;

    // Initialize change queue for better handling of rapid changes
    changeQueueRef.current = createChangeQueue(
      (change) => {
        const lastLocalTime = lastLocalChangeRef.current || 0;
        const remoteTime = change.timestamp || Date.now();
        const timeSinceLocal = Date.now() - lastLocalTime;

        // Simplified logic - be more aggressive with updates for better real-time feel
        const shouldApply =
          change.userId !== userId && // Never apply our own changes
          change.value !== undefined && // Ensure we have a valid value
          timeSinceLocal > 50; // Very short wait after local changes

        if (shouldApply) {
          console.log("Applying remote change:", {
            field: change.field,
            valueLength: change.value ? change.value.length : 0,
            timestamp: change.timestamp,
            timeSinceLocal,
          });

          setRemoteChanges(change);

          // Minimal syncing indicator
          setIsSyncing(true);
          if (syncingTimeoutRef.current) {
            clearTimeout(syncingTimeoutRef.current);
          }
          syncingTimeoutRef.current = setTimeout(() => {
            setIsSyncing(false);
          }, 50); // Very short syncing indicator
        } else {
          console.log("Skipping remote change due to recent local activity:", {
            field: change.field,
            timeSinceLocal,
            isLocalEditing: isLocallyEditing,
          });
        }
      },
      {
        maxQueueSize: 15, // Smaller queue for faster processing
        batchDelay: 5, // Immediate processing
      }
    );

    // Initialize socket connection with enhanced configuration
    socketRef.current = io("https://snippet-hub-full-stack.onrender.com", {
      withCredentials: true,
      // Enhanced connection configuration for stability
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      // Transport configuration for better connectivity
      transports: ["websocket", "polling"],
      upgrade: true,
      autoConnect: true,
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
    }, 25000); // Send ping every 25 seconds

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

    // Listen for real-time content changes with improved handling
    socket.on("snippet-content-changed", (data) => {
      if (data.userId !== userId) {
        console.log("Received remote change:", {
          field: data.field,
          valueLength: data.value ? data.value.length : 0,
          timestamp: data.timestamp,
          userId: data.userId,
        });

        // Use change queue for better handling
        if (changeQueueRef.current) {
          changeQueueRef.current.add({
            ...data,
            receivedAt: Date.now(),
          });
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

      // Clear all timeouts and queues
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (localEditTimeoutRef.current)
        clearTimeout(localEditTimeoutRef.current);
      if (syncingTimeoutRef.current) clearTimeout(syncingTimeoutRef.current);
      if (changeQueueRef.current) changeQueueRef.current.clear();
    };
  }, [snippetId, userId, isLocallyEditing, context.isCollectionContext]);

  // Simplified content change sending with minimal debouncing
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
      const timeoutDuration = 200; // Reduced from 300/250
      localEditTimeoutRef.current = setTimeout(() => {
        setIsLocallyEditing(false);
      }, timeoutDuration);

      // Clear previous debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Minimal debouncing for immediate updates
      const debounceDuration = 30; // Reduced from 75/50
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
