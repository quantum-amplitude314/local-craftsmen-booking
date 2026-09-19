import type { CraftsmenService } from "@local-craftsmen/application";
import { CRAFTS, contract, type SessionUser } from "@local-craftsmen/contracts";
import { implement, ORPCError } from "@orpc/server";

export type ApiContext = { craftsmen: CraftsmenService; user: SessionUser | null };

const os = implement(contract).$context<ApiContext>();

export const router = os.router({
  me: {
    get: os.me.get.handler(({ context }) => {
      const { user } = context;
      if (!user) throw new ORPCError("UNAUTHORIZED");

      return user;
    }),
  },
  crafts: {
    list: os.crafts.list.handler(() => [...CRAFTS]),
  },
  craftsmen: {
    list: os.craftsmen.list.handler(({ context, input }) => context.craftsmen.list(input)),
    find: os.craftsmen.find.handler(async ({ context, input }) => {
      const craftsman = await context.craftsmen.find(input);
      if (!craftsman) throw new ORPCError("NOT_FOUND");

      return craftsman;
    }),
  },
});
