import { userRoleSchema } from "@local-craftsmen/contracts";
import { account, type Db, session, user, verification } from "@local-craftsmen/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { captcha } from "better-auth/plugins";

export const createAuth = ({
  db,
  secret,
  baseURL,
  webOrigin,
  turnstileSecretKey,
}: {
  db: Db;
  secret: string | undefined;
  baseURL: string;
  webOrigin: string;
  turnstileSecretKey: string | undefined;
}) => {
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  if (!turnstileSecretKey) throw new Error("TURNSTILE_SECRET_KEY is required");

  const auth = betterAuth({
    appName: "Local Craftsmen",
    baseURL,
    basePath: "/auth",
    secret,
    trustedOrigins: [webOrigin],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
      transaction: true,
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7, disableSessionRefresh: true },
    user: {
      additionalFields: {
        role: {
          type: ["customer", "craftsman"],
          required: false,
          defaultValue: "customer",
          validator: { input: userRoleSchema },
        },
      },
    },
    plugins: [
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: turnstileSecretKey,
        endpoints: ["/sign-up/email", "/sign-in/email"],
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async ({ path, body }) => {
        if (path === "/update-user" && body && "role" in body) {
          throw new APIError("BAD_REQUEST", { message: "Account roles cannot be changed." });
        }
      }),
    },
  });

  return auth;
};

export type Auth = ReturnType<typeof createAuth>;
