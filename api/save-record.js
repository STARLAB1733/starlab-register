import { getRedis } from "./_redis.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { serviceNumber, record } = req.body;
    if (!serviceNumber) return res.status(400).json({ error: "serviceNumber required" });

    const redis = getRedis();
    await redis.set(`record:${serviceNumber}`, record);
    await redis.sadd("all_service_numbers", serviceNumber);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save record", detail: err.message });
  }
}
