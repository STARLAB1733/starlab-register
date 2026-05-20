import Redis from "ioredis";

let client;

export function getRedis() {
  if (!client) {
    if (!process.env.REDIS_URL) {
      throw new Error("Missing required environment variable: REDIS_URL");
    }
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: false,
      tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    });
    client.on("error", (err) => {
      console.error("[Redis] connection error:", err.message);
      // Reset so next call creates a fresh client
      client = null;
    });
  }
  return client;
}
