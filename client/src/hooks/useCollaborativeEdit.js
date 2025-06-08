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
      reconnectionDelay: 2000, 
      reconnectionDelayMax: 10000, 
      reconnectionAttempts: 10,
      timeout: 30000, 
      transports: ["websocket", "polling"],
      upgrade: true,
      autoConnect: true,
      pingTimeout: 60000, 
      pingInterval: 25000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("WebSocket connected for collaborative editing");
      setIsConnected(true);

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
      socket.emit("join-snippet-edit", { snippetId, userId });
    });

    socket.on("reconnect_error", (error) => {
      console.error("WebSocket reconnection error:", error);
    });

    socket.emit("join-snippet-edit", { snippetId, userId });

    // Add heartbeat mechanism for collaborative editing
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 30000); 
    socket.on("pong", () => {
      console.log("Received collaborative editing pong from server");
    });

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

    socket.on("snippet-content-changed", (data) => {
      if (data.userId !== userId) {
        console.log("Received remote change:", {
          field: data.field,
          valueLength: data.value ? data.value.length : 0,
          timestamp: data.timestamp,
          userId: data.userId,
        });

        const lastLocalTime = lastLocalChangeRef.current || 0;
        const timeSinceLocal = Date.now() - lastLocalTime;

        if (timeSinceLocal > 300) {
          setRemoteChanges(data);

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

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      socket.emit("leave-snippet-edit", { snippetId, userId });
      socket.disconnect();

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (localEditTimeoutRef.current)
        clearTimeout(localEditTimeoutRef.current);
      if (syncingTimeoutRef.current) clearTimeout(syncingTimeoutRef.current);
    };
  }, [snippetId, userId]); 

  const sendContentChange = useCallback(
    (field, value, cursorPosition = null) => {
      if (!socketRef.current || !isConnected) return;

      setIsLocallyEditing(true);

      const timestamp = Date.now();
      lastLocalChangeRef.current = timestamp;

      if (localEditTimeoutRef.current) {
        clearTimeout(localEditTimeoutRef.current);
      }

      const timeoutDuration = 300;
      localEditTimeoutRef.current = setTimeout(() => {
        setIsLocallyEditing(false);
      }, timeoutDuration);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const debounceDuration = 300; 
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
    socket: socketRef.current, 
  };
};
