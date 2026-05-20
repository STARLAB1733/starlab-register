export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { password } = req.body;
  const ok = password && password === process.env.ADMIN_PASSWORD;
  res.status(200).json({ ok: Boolean(ok) });
}
