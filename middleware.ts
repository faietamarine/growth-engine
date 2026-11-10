import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";
import { AB_COOKIE } from "@/lib/landing/ab";

// Pagine pubbliche: login, landing pubblicate (/l/...), API di raccolta lead e risorse statiche.
const PUBLIC = [/^\/login/, /^\/l\//, /^\/api\/lead$/, /^\/api\/track$/, /^\/brand\//, /^\/_next\//, /^\/favicon/, /^\/icon\.svg/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Landing pubbliche: al primo accesso si assegna la variante del test A/B (cookie tecnico di prima parte, 30 giorni).
  if (/^\/l\/(?!privacy$)[a-z0-9-]+$/.test(pathname) && !req.cookies.get(AB_COOKIE)) {
    const v = Math.random() < 0.5 ? "A" : "B";
    const headers = new Headers(req.headers);
    headers.set("cookie", `${req.headers.get("cookie") ? `${req.headers.get("cookie")}; ` : ""}${AB_COOKIE}=${v}`);
    const res = NextResponse.next({ request: { headers } });
    res.cookies.set(AB_COOKIE, v, { maxAge: 30 * 86400, sameSite: "lax", path: "/l", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    return res;
  }
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ errore: "Accesso richiesto" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?da=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
