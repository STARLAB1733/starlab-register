import { getRedis } from "./_redis.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { serviceNumber, recordType } = req.body;
    if (!serviceNumber) return res.status(400).json({ error: "serviceNumber required" });
    if (!recordType) return res.status(400).json({ error: "recordType required" });

    const redis = getRedis();

    // Try new key first, fall back to legacy key for onboarding records
    let record = await redis.get(`record:${recordType}:${serviceNumber}`);
    if (!record && recordType === "onboarding") {
      record = await redis.get(`record:${serviceNumber}`);
    }

    res.status(200).json({ record: record || null });
  } catch (err) {
    res.status(500).json({ error: "Failed to get record", detail: err.message });
  }
}
