import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { serviceNumber, record } = req.body;
  if (!serviceNumber) return res.status(400).json({ error: "serviceNumber required" });

  await kv.set(`record:${serviceNumber}`, record);
  await kv.sadd("all_service_numbers", serviceNumber);

  res.status(200).json({ ok: true });
}
