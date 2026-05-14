export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const paRes = await fetch(process.env.PA_LIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await paRes.json();
  res.status(200).json({ records: data.records || [] });
}
