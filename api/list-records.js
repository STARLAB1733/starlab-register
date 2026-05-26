import { getRedis } from "./_redis.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const redis = getRedis();

    // New keys: all_records set contains members like "onboarding:+6591234567"
    const newMembers = await redis.smembers("all_records");

    // Legacy keys: all_service_numbers set contains plain phone numbers (onboarding only)
    const legacyNumbers = await redis.smembers("all_service_numbers");

    // Build a deduplicated fetch list — new keys take priority over legacy
    const newKeys = (newMembers || []).map((m) => ({ key: `record:${m}`, member: m }));
    const newMemberSet = new Set(newMembers || []);

    // Include legacy numbers only if not already covered by a new key
    const legacyKeys = (legacyNumbers || [])
      .filter((sn) => !newMemberSet.has(`onboarding:${sn}`))
      .map((sn) => ({ key: `record:${sn}`, member: `onboarding:${sn}` }));

    const allKeys = [...newKeys, ...legacyKeys];
    if (!allKeys.length) return res.status(200).json({ records: [] });

    const records = await Promise.all(allKeys.map(({ key }) => redis.get(key)));
    res.status(200).json({ records: records.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: "Failed to load records", detail: err.message });
  }
}
