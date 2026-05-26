import { getRedis } from "./_redis.js";
import crypto from "crypto";

function verifyToken(token) {
  const password = process.env.ADMIN_PASSWORD || "";
  if (!password || !token) return false;
  const expected = crypto.createHmac("sha256", password).update("starlab-admin-session").digest("hex");
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { serviceNumber, recordType, action, rejectionReason, token } = req.body || {};

  if (!verifyToken(token)) return res.status(401).json({ error: "Unauthorized" });
  if (!serviceNumber || !recordType) return res.status(400).json({ error: "serviceNumber and recordType required" });
  if (!["approve", "reject"].includes(action)) return res.status(400).json({ error: "action must be approve or reject" });
  if (action === "reject" && !rejectionReason?.trim()) return res.status(400).json({ error: "rejectionReason required" });

  try {
    const redis = getRedis();
    const key = `record:${recordType}:${serviceNumber}`;
    const raw = await redis.get(key);
    if (!raw) return res.status(404).json({ error: "Record not found" });

    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record.submitted) return res.status(400).json({ error: "Record has not been submitted" });
    if (record.approved) return res.status(400).json({ error: "Record is already approved" });

    if (action === "approve") {
      record.approved = true;
      record.approvedAt = new Date().toISOString();
      record.rejected = false;
      record.rejectionReason = "";
    } else {
      record.rejected = true;
      record.rejectionReason = rejectionReason.trim();
      record.approved = false;
      record.approvedAt = null;
    }

    await redis.set(key, JSON.stringify(record));
    res.status(200).json({ ok: true, record });
  } catch (err) {
    res.status(500).json({ error: "Failed to update record", detail: err.message });
  }
}
