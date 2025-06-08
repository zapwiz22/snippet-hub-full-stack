import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export const useWebSocket = (
  collectionId,
  onSnippetAdded,
  onSnippetUpdated,
  onSnippetDeleted,
  onCollectionUpdated
) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!collectionId) return;

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
      console.log("WebSocket connected for collection:", collectionId);
      socket.emit("join-collection", collectionId);
    });

    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(
        "WebSocket reconnected for collection after",
        attemptNumber,
        "attempts"
      );
      socket.emit("join-collection", collectionId);
    });

    // Add heartbeat mechanism
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 25000); // Send ping every 25 seconds

    socket.on("pong", () => {
      console.log("Received pong from server");
    });

    socket.emit("join-collection", collectionId);

    // Set up event listeners
    socket.on("snippet-added", (data) => {
      if (data.collectionId === collectionId && onSnippetAdded) {
        console.log("New snippet added to collection:", data.snippet.title);
        onSnippetAdded(data.snippet);
      }
    });

    socket.on("snippet-updated", (data) => {
      if (data.collectionId === collectionId && onSnippetUpdated) {
        console.log("Snippet updated in collection:", data.snippet.title);
        onSnippetUpdated(data.snippet);
      }
    });

    socket.on("snippet-deleted", (data) => {
      if (data.collectionId === collectionId && onSnippetDeleted) {
        console.log("Snippet deleted from collection");
        onSnippetDeleted(data.snippetId);
      }
    });

    socket.on("collection-updated", (data) => {
      if (data.collectionId === collectionId && onCollectionUpdated) {
        console.log("Collection updated");
        onCollectionUpdated(data);
      }
    });

    // Cleanup on unmount
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      socket.emit("leave-collection", collectionId);
      socket.disconnect();
    };
  }, [
    collectionId,
    onSnippetAdded,
    onSnippetUpdated,
    onSnippetDeleted,
    onCollectionUpdated,
  ]);

  return socketRef.current;
};
