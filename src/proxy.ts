import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 "proxy" convention (formerly "middleware").
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - /api routes (they authenticate themselves and return 401)
     * - PWA + static files (sw.js, manifest, offline page, images, fonts)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.png|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|woff2?)$).*)",
  ],
};
