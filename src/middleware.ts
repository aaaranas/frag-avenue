import { NextResponse, type NextRequest } from "next/server";

/**
 * Publishes the requested path to Server Components as `x-pathname`.
 *
 * A layout cannot see the URL it is rendering, and `src/app/(app)/layout.tsx`
 * is the component that actually enforces authentication for the whole app
 * shell. Without this header the layout could only redirect to a bare
 * `/sign-in`, discarding where the visitor was headed — which is exactly what
 * used to happen, silently making the `next=` parameter each page passes to
 * `requireUser()` dead code.
 *
 * Deliberately does NOT call `auth()`. The credentials provider hashes with
 * bcrypt, which is not edge-runtime safe, so authorization stays in the layout
 * where the Node runtime is available. This middleware only forwards a header.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Everything except Next's internals, the auth API, and static assets.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
