import { NextResponse, type NextRequest } from "next/server";
import { movedTo } from "@/lib/moved";

// Orbit is verhuisd naar Production Lab → Doelen (november 2026): elke pagina stuurt door naar dezelfde plek daar
// (tijdelijk, 307, zodat terugdraaien kan). Alleen /api/health blijft hier antwoorden (keep-warm). De oude
// inlogcontrole staat in de git-geschiedenis (vóór commit "Orbit stuurt door naar het menu Doelen").
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();
  return NextResponse.redirect(movedTo(request.nextUrl.pathname, request.nextUrl.search), 307);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
