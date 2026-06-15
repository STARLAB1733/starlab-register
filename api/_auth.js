import crypto from "crypto";

// Constant-time comparison against ADMIN_PASSWORD to prevent timing attacks
export function isAdminAuthorized(password) {
  if (!process.env.ADMIN_PASSWORD || !password) return false;
  const stored = Buffer.from(process.env.ADMIN_PASSWORD);
  const provided = Buffer.from(password);
  return stored.length === provided.length && crypto.timingSafeEqual(stored, provided);
}
