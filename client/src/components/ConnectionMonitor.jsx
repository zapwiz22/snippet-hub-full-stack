import React, { useState, useEffect } from "react";

const ConnectionMonitor = ({ socket, type = "collection" }) => {
  const [connectionStats, setConnectionStats] = useState({
    connected: false,
    lastPing: null,
    reconnectAttempts: 0,
    transportType: null,
    latency: null,
  });

  useEffect(() => {
    if (!socket) return;

    const updateStats = () => {
      setConnectionStats((prev) => ({
        ...prev,
        connected: socket.connected,
        transportType: socket.io?.engine?.transport?.name || "unknown",
      }));
    };

    // Initial update
    updateStats();

    // Socket event listeners
    socket.on("connect", () => {
      console.log(`${type} socket connected`);
      updateStats();
      setConnectionStats((prev) => ({ ...prev, reconnectAttempts: 0 }));
    });

    socket.on("disconnect", (reason) => {
      console.log(`${type} socket disconnected:`, reason);
      updateStats();
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`${type} socket reconnected after ${attemptNumber} attempts`);
      updateStats();
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      setConnectionStats((prev) => ({
        ...prev,
        reconnectAttempts: attemptNumber,
      }));
    });

    socket.on("pong", () => {
      const now = Date.now();
      setConnectionStats((prev) => ({
        ...prev,
        lastPing: now,
        latency: prev.lastPingStart ? now - prev.lastPingStart : null,
      }));
    });

    // Ping every 30 seconds to measure latency
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        setConnectionStats((prev) => ({ ...prev, lastPingStart: Date.now() }));
        socket.emit("ping");
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("reconnect");
      socket.off("reconnect_attempt");
      socket.off("pong");
    };
  }, [socket, type]);

  if (!socket) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs max-w-xs">
      <div className="font-semibold mb-2 text-gray-700">
        {type.charAt(0).toUpperCase() + type.slice(1)} Connection
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <div className="flex items-center space-x-1">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStats.connected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span
              className={
                connectionStats.connected ? "text-green-600" : "text-red-600"
              }
            >
              {connectionStats.connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {connectionStats.transportType && (
          <div className="flex justify-between">
            <span>Transport:</span>
            <span className="text-gray-600">
              {connectionStats.transportType}
            </span>
          </div>
        )}

        {connectionStats.latency && (
          <div className="flex justify-between">
            <span>Latency:</span>
            <span className="text-gray-600">{connectionStats.latency}ms</span>
          </div>
        )}

        {connectionStats.reconnectAttempts > 0 && (
          <div className="flex justify-between">
            <span>Reconnect attempts:</span>
            <span className="text-orange-600">
              {connectionStats.reconnectAttempts}
            </span>
          </div>
        )}

        {connectionStats.lastPing && (
          <div className="flex justify-between">
            <span>Last ping:</span>
            <span className="text-gray-600">
              {new Date(connectionStats.lastPing).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionMonitor;
