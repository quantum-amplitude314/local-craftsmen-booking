import { type Contract, contract } from "@local-craftsmen/contracts";
import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

const link = new OpenAPILink(contract, {
  url: apiUrl,
  fetch: (request, init) => globalThis.fetch(request, { ...init, cache: "no-store" }),
});

export const apiClient: JsonifiedClient<ContractRouterClient<Contract>> = createORPCClient(link);
