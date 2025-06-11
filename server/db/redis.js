import redis from "redis";

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    tls: process.env.REDIS_URL?.includes("upstash.io") ? true : false,
    rejectUnauthorized: false,
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

export { redisClient };

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

redisClient.on("connect", () => {
  console.log("Redis client connected");
});

redisClient.on("ready", () => {
  console.log("Redis client ready");
});

redisClient.on("end", () => {
  console.log("Redis client disconnected");
});

export async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Connected to Redis");
    }
  } catch (err) {
    console.log("Failed to connect to Redis:", err);
  }
}
