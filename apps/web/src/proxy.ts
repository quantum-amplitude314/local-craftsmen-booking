import { type NextRequest, NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { hasSessionCookie } from "./lib/session-cookie";

const handleLocaleRouting = createMiddleware(routing);

/**
 * Pages that need an account. A cookie whose session is gone still gets through; only the API
 * knows, so those pages sign it out themselves.
 */
const SIGNED_IN_PATHS = ["/dashboard", "/profile", "/craftsmen"];

/** Pages for visitors without an account; a session cookie sends them to the dashboard. */
const SIGNED_OUT_PATHS = ["/", "/login", "/register"];

/** Splits `/cs/dashboard` into the locale prefix `/cs` and the path `/dashboard`. */
const readLocalePath = (pathname: string) => {
  const [, firstSegment = "", ...restSegments] = pathname.split("/");
  const localePath = hasLocale(routing.locales, firstSegment)
    ? { prefix: `/${firstSegment}`, path: `/${restSegments.join("/")}` }
    : { prefix: "", path: pathname };

  return localePath;
};

const needsAccount = (path: string) =>
  SIGNED_IN_PATHS.some(
    (signedInPath) => path === signedInPath || path.startsWith(`${signedInPath}/`),
  );

/** Where the session cookie sends a request before anything renders. */
const findAuthRedirect = ({ path, signedIn }: { path: string; signedIn: boolean }) => {
  if (!signedIn && needsAccount(path)) return "/login";
  if (signedIn && SIGNED_OUT_PATHS.includes(path)) return "/dashboard";

  return null;
};

export default function proxy(request: NextRequest) {
  const { prefix, path } = readLocalePath(request.nextUrl.pathname);
  const redirectPath = findAuthRedirect({ path, signedIn: hasSessionCookie(request.cookies) });
  if (redirectPath) return NextResponse.redirect(new URL(`${prefix}${redirectPath}`, request.url));

  return handleLocaleRouting(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
