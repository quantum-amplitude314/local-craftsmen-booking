import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import proxy from "./proxy";

const SESSION_COOKIE = "better-auth.session_token=token";

const requestPage = ({ path, signedIn }: { path: string; signedIn: boolean }) => {
  const headers = signedIn ? { cookie: SESSION_COOKIE } : {};
  const request = new NextRequest(new URL(path, "https://craftsmen.test"), { headers });

  return request;
};

const redirectTarget = ({ path, signedIn }: { path: string; signedIn: boolean }) => {
  const location = proxy(requestPage({ path, signedIn })).headers.get("location");
  const target = location ? new URL(location).pathname : null;

  return target;
};

describe("proxy", () => {
  test("sends a visitor without a session cookie from account pages to sign-in", () => {
    expect(redirectTarget({ path: "/dashboard", signedIn: false })).toBe("/login");
    expect(redirectTarget({ path: "/profile", signedIn: false })).toBe("/login");
    expect(redirectTarget({ path: "/craftsmen/some-id", signedIn: false })).toBe("/login");
  });

  test("keeps the locale prefix", () => {
    expect(redirectTarget({ path: "/cs/dashboard", signedIn: false })).toBe("/cs/login");
    expect(redirectTarget({ path: "/cs", signedIn: true })).toBe("/cs/dashboard");
  });

  test("sends a visitor with a session cookie from the landing, sign-in and registration pages to the dashboard", () => {
    expect(redirectTarget({ path: "/", signedIn: true })).toBe("/dashboard");
    expect(redirectTarget({ path: "/login", signedIn: true })).toBe("/dashboard");
    expect(redirectTarget({ path: "/register", signedIn: true })).toBe("/dashboard");
  });

  test("leaves public pages to the page itself", () => {
    expect(redirectTarget({ path: "/login", signedIn: false })).toBeNull();
    expect(redirectTarget({ path: "/register", signedIn: false })).toBeNull();
    expect(redirectTarget({ path: "/contact", signedIn: false })).toBeNull();
    expect(redirectTarget({ path: "/", signedIn: false })).toBeNull();
  });

  test("does not mistake a path that only starts like an account page", () => {
    expect(redirectTarget({ path: "/dashboards", signedIn: false })).toBeNull();
  });
});
