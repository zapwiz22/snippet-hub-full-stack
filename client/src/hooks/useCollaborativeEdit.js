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

        // More conservative application logic - be more cautious during active typing
        const shouldApply =
          remoteTime > lastLocalTime - 50 && // Narrow window for conflicting changes
          change.userId !== userId && // Never apply our own changes
          change.value !== undefined && // Ensure we have a valid value
          timeSinceLocal > 100; // Wait a bit after local changes before applying remote ones

        if (shouldApply) {
          console.log("Applying remote change:", {
            field: change.field,
            valueLength: change.value ? change.value.length : 0,
            timestamp: change.timestamp,
            timeSinceLocal,
          });

          setRemoteChanges(change);

          // Show syncing indicator with context awareness
          const shouldShowSyncing =
            !context.isCollectionContext || !isLocallyEditing;
          if (shouldShowSyncing) {
            setIsSyncing(true);

            // Clear previous syncing timeout
            if (syncingTimeoutRef.current) {
              clearTimeout(syncingTimeoutRef.current);
            }

            // Much shorter syncing display duration
            const syncingDuration = context.isCollectionContext ? 100 : 120;
            syncingTimeoutRef.current = setTimeout(() => {
              setIsSyncing(false);
            }, syncingDuration);
          }
        } else {
          console.log("Skipping remote change due to recent local activity:", {
            field: change.field,
            timeSinceLocal,
            isLocalEditing: isLocallyEditing,
          });
        }
      },
      {
        maxQueueSize: 25, // Larger queue size for busy scenarios
        batchDelay: 15, // Very fast processing
      }
    );

    // Initialize socket connection
    socketRef.current = io("http://localhost:3000", {
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("WebSocket connected for collaborative editing");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setActiveUsers([]);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setIsConnected(false);
    });

    // Join the snippet editing room
    socket.emit("join-snippet-edit", { snippetId, userId });

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

  // Enhanced content change sending with improved debouncing
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
      const timeoutDuration = context.isCollectionContext ? 300 : 250;
      localEditTimeoutRef.current = setTimeout(() => {
        setIsLocallyEditing(false);
      }, timeoutDuration);

      // Clear previous debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Much shorter debouncing for smoother real-time updates
      const debounceDuration = context.isCollectionContext ? 75 : 50;
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
  };
};
