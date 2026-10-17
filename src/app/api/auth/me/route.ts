import { getCurrentUser } from "@/lib/auth/session";
import { ok, err } from "@/lib/api/response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return err("UNAUTHORIZED", "نشست فعال یافت نشد.", 401);
  return ok({ user });
}
