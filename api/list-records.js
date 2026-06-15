import { getRedis } from "./_redis.js";
import { isAdminAuthorized } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!isAdminAuthorized(req.body?.password)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const redis = getRedis();
    const tokens = await redis.smembers("all_tokens");
    if (!tokens || !tokens.length) return res.status(200).json({ records: [] });

    const records = await Promise.all(tokens.map((t) => redis.get(`record:${t}`)));
    res.status(200).json({ records: records.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: "Failed to load records", detail: err.message });
  }
}
