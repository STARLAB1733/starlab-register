import { Redis } from "@upstash/redis";

let client;

export function getRedis() {
  if (!client) {
    const url = process.env.UPSTASH_REDIS_KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;
    if (!url || !token) {
      throw new Error("Missing required environment variables: UPSTASH_REDIS_KV_REST_API_URL / UPSTASH_REDIS_KV_REST_API_TOKEN");
    }
    client = new Redis({ url, token });
  }
  return client;
}
