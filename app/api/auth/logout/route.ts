import { apiOk } from "@/lib/api";
import { getCookieConfig } from "@/lib/auth";

export async function POST() {
  const response = apiOk({ authenticated: false });
  const cookie = getCookieConfig();
  response.cookies.set(cookie.name, "", { ...cookie.options, maxAge: 0 });
  return response;
}
