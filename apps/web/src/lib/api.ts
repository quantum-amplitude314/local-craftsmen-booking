import "server-only";

import { type Contract, contract } from "@local-craftsmen/contracts";
import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { cookies } from "next/headers";

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

const link = new OpenAPILink(contract, {
  url: apiUrl,
  headers: async () => {
    const cookieStore = await cookies();
    const headers = { cookie: cookieStore.toString() };

    return headers;
  },
  fetch: (request, init) => globalThis.fetch(request, { ...init, cache: "no-store" }),
});

/** Server-side API client that forwards the visitor's session cookie. */
export const apiClient: JsonifiedClient<ContractRouterClient<Contract>> = createORPCClient(link);
