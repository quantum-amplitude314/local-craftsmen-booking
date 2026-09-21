import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createCraftsmenService } from "@local-craftsmen/application";
import { startTestDb } from "@local-craftsmen/db/test-db";
import { createApp } from "../src/app.ts";
import { createAuth } from "../src/auth.ts";

const baseUrl = "http://localhost:3001";
const webOrigin = "http://localhost:3000";
const password = "correct-horse-battery";

let app: ReturnType<typeof createApp<Record<string, never>>>;
let stopDb: () => Promise<void>;

const call = async ({
  path,
  method = "GET",
  body,
  cookie,
}: {
  path: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  cookie?: string;
}) => {
  const headers = new Headers({ Origin: webOrigin });
  if (body) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);

  const request = body
    ? new Request(`${baseUrl}${path}`, { method, headers, body: JSON.stringify(body) })
    : new Request(`${baseUrl}${path}`, { method, headers });
  const response = await app.fetch(request);

  return response;
};

const readSessionCookie = ({ response }: { response: Response }) => {
  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .join("; ");

  return cookie;
};

const registerUser = async ({ role }: { role: "customer" | "craftsman" }) => {
  const email = `${role}-${crypto.randomUUID()}@example.com`;
  const response = await call({
    path: "/auth/sign-up/email",
    method: "POST",
    body: { name: `Test ${role}`, email, password, role },
  });

  const account = { email, response, cookie: readSessionCookie({ response }) };

  return account;
};

beforeAll(async () => {
  const { db, stop } = await startTestDb();
  stopDb = stop;

  const auth = createAuth({
    db,
    secret: "test-secret-with-at-least-32-characters",
    baseURL: baseUrl,
    webOrigin,
  });
  const craftsmen = createCraftsmenService({ db });

  app = createApp<Record<string, never>>({
    createApiContext: () => ({ craftsmen, getAuth: () => auth }),
  });
});

afterAll(async () => {
  await stopDb();
});

describe("authentication", () => {
  test("registers a customer and exposes the session user", async () => {
    const { email, response, cookie } = await registerUser({ role: "customer" });

    expect(response.status).toBe(200);
    expect(cookie).toContain("session_token");

    const me = await call({ path: "/me", cookie });

    expect(me.status).toBe(200);
    expect(me.headers.get("Cache-Control")).toBe("no-store");
    await expect(me.json()).resolves.toMatchObject({ email, role: "customer" });
  });

  test("registers a craftsman with the craftsman role", async () => {
    const { cookie } = await registerUser({ role: "craftsman" });
    const me = await call({ path: "/me", cookie });

    expect(me.status).toBe(200);
    await expect(me.json()).resolves.toMatchObject({ role: "craftsman" });
  });

  test("rejects a second registration with the same email", async () => {
    const { email } = await registerUser({ role: "customer" });
    const response = await call({
      path: "/auth/sign-up/email",
      method: "POST",
      body: { name: "Impostor", email, password, role: "craftsman" },
    });

    expect(response.ok).toBe(false);
  });

  test("signs an existing customer back in", async () => {
    const { email } = await registerUser({ role: "customer" });
    const response = await call({
      path: "/auth/sign-in/email",
      method: "POST",
      body: { email, password },
    });

    expect(response.status).toBe(200);

    const me = await call({ path: "/me", cookie: readSessionCookie({ response }) });

    await expect(me.json()).resolves.toMatchObject({ email, role: "customer" });
  });

  test("rejects a wrong password", async () => {
    const { email } = await registerUser({ role: "customer" });
    const response = await call({
      path: "/auth/sign-in/email",
      method: "POST",
      body: { email, password: "not-the-password" },
    });

    expect(response.status).toBe(401);
  });

  test("rejects an unauthenticated request for the session user", async () => {
    const response = await call({ path: "/me" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Sign in to continue",
    });
  });

  test("rejects a session cookie that was tampered with", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    const response = await call({ path: "/me", cookie: `${cookie}x` });

    expect(response.status).toBe(401);
  });

  test("refuses to change the role of an existing account", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    const response = await call({
      path: "/auth/update-user",
      method: "POST",
      body: { role: "craftsman" },
      cookie,
    });

    expect(response.status).toBe(400);

    const me = await call({ path: "/me", cookie });

    await expect(me.json()).resolves.toMatchObject({ role: "customer" });
  });

  test("ends the session on sign out", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    const signOut = await call({ path: "/auth/sign-out", method: "POST", body: {}, cookie });

    expect(signOut.status).toBe(200);

    const me = await call({ path: "/me", cookie });

    expect(me.status).toBe(401);
  });
});
