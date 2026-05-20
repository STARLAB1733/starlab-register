import crypto from "crypto";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, error: "Admin password not configured" });
  }

  const { password } = req.body;
  if (!password) return res.status(200).json({ ok: false });

  // Constant-time comparison to prevent timing attacks
  const stored = Buffer.from(process.env.ADMIN_PASSWORD);
  const provided = Buffer.from(password);
  const match =
    stored.length === provided.length &&
    crypto.timingSafeEqual(stored, provided);

  res.status(200).json({ ok: match });
}
