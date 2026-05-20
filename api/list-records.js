import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const serviceNumbers = await kv.smembers("all_service_numbers");
  if (!serviceNumbers || !serviceNumbers.length) return res.status(200).json({ records: [] });

  const records = await Promise.all(serviceNumbers.map((sn) => kv.get(`record:${sn}`)));
  res.status(200).json({ records: records.filter(Boolean) });
}
