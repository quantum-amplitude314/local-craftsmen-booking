import "server-only";

import { type Contract, contract } from "@local-craftsmen/contracts";
import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { cookies } from "next/headers";
import { apiFetch, getApiBaseUrl } from "@/lib/api-fetch";

const link = new OpenAPILink(contract, {
  url: getApiBaseUrl,
  headers: async () => {
    const cookieStore = await cookies();
    const headers = { cookie: cookieStore.toString() };

    return headers;
  },
  fetch: (request, init) => apiFetch(new Request(request, init)),
});

/** Server-side API client that forwards the visitor's session cookie. */
export const apiClient: JsonifiedClient<ContractRouterClient<Contract>> = createORPCClient(link);
