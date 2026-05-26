import { getRedis } from "./_redis.js";

const MAX_RECORD_BYTES = 512 * 1024; // 512 KB per record

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { serviceNumber, record } = req.body;

    if (!serviceNumber) return res.status(400).json({ error: "serviceNumber required" });
    if (!record) return res.status(400).json({ error: "record required" });

    let parsed;
    try {
      parsed = typeof record === "string" ? JSON.parse(record) : record;
    } catch {
      return res.status(400).json({ error: "record must be valid JSON" });
    }

    if (parsed.phoneNumber && parsed.phoneNumber !== serviceNumber) {
      return res.status(400).json({ error: "serviceNumber mismatch" });
    }

    const serialised = typeof record === "string" ? record : JSON.stringify(record);
    if (Buffer.byteLength(serialised, "utf8") > MAX_RECORD_BYTES) {
      return res.status(400).json({ error: "record too large" });
    }

    const recordType = parsed.type || "onboarding";
    const key = `record:${recordType}:${serviceNumber}`;
    const setMember = `${recordType}:${serviceNumber}`;

    const redis = getRedis();

    // Lock check — protect submitted and approved records
    const existing = await redis.get(key);
    if (existing) {
      let existingParsed;
      try { existingParsed = JSON.parse(existing); } catch { /* ignore */ }

      if (existingParsed?.approved) {
        // Fully locked after S1 approval — no further changes allowed
        return res.status(403).json({ error: "Record has been approved and cannot be modified" });
      }

      if (existingParsed?.submitted && !existingParsed?.rejected) {
        // Pending S1 approval — lock all fields except adminComment
        parsed.sections = existingParsed.sections;
        parsed.submitted = true;
        parsed.submittedAt = existingParsed.submittedAt;
        parsed.declarationName = existingParsed.declarationName;
        parsed.declarationPhone = existingParsed.declarationPhone;
        parsed.declarationEmail = existingParsed.declarationEmail;
        parsed.refNumber = existingParsed.refNumber;
        parsed.approved = false;
        parsed.approvedAt = null;
        parsed.rejected = false;
        parsed.rejectionReason = "";
      } else if (existingParsed?.submitted && existingParsed?.rejected) {
        // Rejected — allow new declaration but keep sections and approval state locked
        parsed.sections = existingParsed.sections;
        parsed.approved = false;
        parsed.approvedAt = null;
      }
    }

    await redis.set(key, JSON.stringify(parsed));
    await redis.sadd("all_records", setMember);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save record", detail: err.message });
  }
}
