import { getRedis } from "./_redis.js";

const MAX_RECORD_BYTES = 512 * 1024; // 512 KB per record

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { token, record } = req.body;

    if (!token) return res.status(400).json({ error: "token required" });
    if (!record) return res.status(400).json({ error: "record required" });

    // Validate record is valid JSON
    let parsed;
    try {
      parsed = typeof record === "string" ? JSON.parse(record) : record;
    } catch {
      return res.status(400).json({ error: "record must be valid JSON" });
    }

    // Validate token matches the record's token
    if (parsed.token && parsed.token !== token) {
      return res.status(400).json({ error: "token mismatch" });
    }

    // Validate record size
    const serialised = typeof record === "string" ? record : JSON.stringify(record);
    if (Buffer.byteLength(serialised, "utf8") > MAX_RECORD_BYTES) {
      return res.status(400).json({ error: "record too large" });
    }

    const redis = getRedis();

    // If an existing record is acknowledged, only allow adminComment updates
    const existing = await redis.get(`record:${token}`);
    if (existing?.acknowledged) {
      // Preserve locked fields — only adminComment may change
      parsed.sections = existing.sections;
      parsed.acknowledged = true;
      parsed.acknowledgedAt = existing.acknowledgedAt;
    }

    await redis.set(`record:${token}`, parsed);
    await redis.sadd("all_tokens", token);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save record", detail: err.message });
  }
}
