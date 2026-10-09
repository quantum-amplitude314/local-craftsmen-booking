/** Better Auth's session cookie, under its plain name and the `__Secure-` name it gets over HTTPS. */
const SESSION_COOKIE_NAMES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

/** Whether a session cookie is present; only the API can tell whether its session still exists. */
export const hasSessionCookie = (cookies: { has: (name: string) => boolean }) =>
  SESSION_COOKIE_NAMES.some((name) => cookies.has(name));
