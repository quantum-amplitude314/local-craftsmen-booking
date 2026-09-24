import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getEnv } from "@/lib/env";

/** The service binding reads only the path, so its requests get a placeholder host. */
const serviceBindingOrigin = "https://api.internal";

const fetchThroughServiceBinding = async (request: Request) => {
  const { env } = await getCloudflareContext({ async: true });
  const response = await env.API.fetch(request);

  return response;
};

const fetchOverHttp = (request: Request) => fetch(request, { cache: "no-store" });

/** Base URL API paths resolve against: API_URL when WRANGLER_BINDING is "off". */
export const getApiBaseUrl = async () => {
  const env = await getEnv();
  const baseUrl = env.WRANGLER_BINDING === "on" ? serviceBindingOrigin : env.API_URL;

  return baseUrl;
};

/**
 * Sends a request to the API. WRANGLER_BINDING "on": the `API` service binding from
 * wrangler.jsonc. "off": HTTP to API_URL.
 */
export const apiFetch = async (request: Request) => {
  const { WRANGLER_BINDING: wranglerBinding } = await getEnv();
  const response =
    wranglerBinding === "on"
      ? await fetchThroughServiceBinding(request)
      : await fetchOverHttp(request);

  return response;
};
