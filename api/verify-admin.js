import { isAdminAuthorized } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, error: "Admin password not configured" });
  }

  const { password } = req.body;
  res.status(200).json({ ok: isAdminAuthorized(password) });
}
