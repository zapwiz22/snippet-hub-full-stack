import redis from "redis";

const redisClient = redis.createClient();
export { redisClient };
redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

export async function connectRedis() {
  try {
    await redisClient.connect();
    console.log("Connected to Redis");
  } catch (err) {
    console.log("Failed to connect to Redis:", err);
  }
}
