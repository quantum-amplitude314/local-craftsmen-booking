import { exports } from "cloudflare:workers";
import { describe, expect, test } from "vitest";
import "../src/index.ts";

describe("API Worker", () => {
  test("reports its health", async () => {
    const response = await exports.default.fetch("http://example.com/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  test("serves the oRPC OpenAPI routes", async () => {
    const response = await exports.default.fetch("http://example.com/crafts");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      "painter",
      "plumber",
      "electrician",
      "carpenter",
      "tiler",
    ]);
  });

  test("returns JSON for unmatched routes", async () => {
    const response = await exports.default.fetch("http://example.com/unknown");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ code: "NOT_FOUND", message: "Not found" });
  });
});
