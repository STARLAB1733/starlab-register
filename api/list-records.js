import { getRedis } from "./_redis.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const redis = getRedis();
    const serviceNumbers = await redis.smembers("all_service_numbers");
    if (!serviceNumbers || !serviceNumbers.length) return res.status(200).json({ records: [] });

    const records = await Promise.all(serviceNumbers.map((sn) => redis.get(`record:${sn}`)));
    res.status(200).json({ records: records.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: "Failed to load records", detail: err.message });
  }
}
