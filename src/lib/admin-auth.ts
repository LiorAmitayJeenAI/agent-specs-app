import { NextRequest } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "jeen-admin-2026";

export function verifyAdminToken(request: NextRequest): boolean {
  const token = request.headers.get("x-admin-token");
  return token === ADMIN_PASSWORD;
}
