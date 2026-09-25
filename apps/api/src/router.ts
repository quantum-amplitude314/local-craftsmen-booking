import {
  type BookingsService,
  type CraftsmenService,
  DomainError,
  type LocationsService,
  type SlotsService,
} from "@local-craftsmen/application";
import { CRAFTS, contract, type SessionUser } from "@local-craftsmen/contracts";
import { implement, ORPCError } from "@orpc/server";

export type ApiContext = {
  craftsmen: CraftsmenService;
  slots: SlotsService;
  bookings: BookingsService;
  locations: LocationsService;
  user: SessionUser | null;
};

const execute = async <Result>(operation: () => Promise<Result>) => {
  try {
    const result = await operation();

    return result;
  } catch (error) {
    if (error instanceof DomainError) throw new ORPCError(error.code, { message: error.message });
    const cause = error instanceof Error ? error.cause : undefined;
    const code = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
    if (code === "23503" || code === "23514")
      throw new ORPCError("BAD_REQUEST", { message: "Invalid location or data" });
    if (code === "23P01" || code === "23505")
      throw new ORPCError("CONFLICT", { message: "Time or coverage already exists" });
    throw error;
  }
};

const os = implement(contract).$context<ApiContext>();

export const router = os.router({
  me: {
    availability: {
      day: os.me.availability.day.handler(({ context, input }) => {
        const { user, slots } = context;
        if (!user) throw new ORPCError("UNAUTHORIZED");
        const { date, cityId } = input;

        return execute(() => slots.day({ craftsmanId: user.id, date, cityId }));
      }),
      create: os.me.availability.create.handler(({ context, input }) => {
        const { user, slots } = context;
        if (!user) throw new ORPCError("UNAUTHORIZED");

        return execute(() => slots.create({ craftsmanId: user.id, input }));
      }),
      remove: os.me.availability.remove.handler(({ context, input }) => {
        const { user, slots } = context;
        if (!user) throw new ORPCError("UNAUTHORIZED");
        const { id } = input;

        return execute(() => slots.remove({ craftsmanId: user.id, id }));
      }),
    },
    bookings: {
      list: os.me.bookings.list.handler(({ context }) => {
        const { user, bookings } = context;
        if (!user) throw new ORPCError("UNAUTHORIZED");

        return bookings.list({ user });
      }),
      range: os.me.bookings.range.handler(({ context, input }) => {
        const { user, bookings } = context;
        if (!user) throw new ORPCError("UNAUTHORIZED");
        const { start, end } = input;

        return bookings.range({ userId: user.id, start, end });
      }),
      advance: os.me.bookings.advance.handler(({ context, input }) => {
        const { user, bookings } = context;
        if (!user) throw new ORPCError("UNAUTHORIZED");
        const { id, transition } = input;

        return execute(() => bookings.advance({ actor: user, id, transition }));
      }),
    },
    profile: {
      get: os.me.profile.get.handler(({ context }) => {
        const { user, craftsmen } = context;
        if (!user) throw new ORPCError("UNAUTHORIZED");
        const profile = craftsmen.getProfile({ id: user.id });

        return profile;
      }),
      save: os.me.profile.save.handler(({ context, input }) => {
        const { user, craftsmen } = context;
        if (!user) throw new ORPCError("UNAUTHORIZED");
        const profile = execute(() => craftsmen.saveProfile({ id: user.id, input }));

        return profile;
      }),
    },
    get: os.me.get.handler(({ context }) => {
      const { user } = context;
      if (!user) throw new ORPCError("UNAUTHORIZED");

      return user;
    }),
  },
  locations: {
    list: os.locations.list.handler(({ context }) => context.locations.list()),
  },
  slots: {
    list: os.slots.list.handler(({ context, input }) => context.slots.search({ input })),
  },
  bookings: {
    create: os.bookings.create.handler(({ context, input }) => {
      const { user, bookings } = context;
      if (!user) throw new ORPCError("UNAUTHORIZED");

      return execute(() => bookings.create({ customerId: user.id, input }));
    }),
  },
  crafts: {
    list: os.crafts.list.handler(() => [...CRAFTS]),
  },
  craftsmen: {
    find: os.craftsmen.find.handler(async ({ context, input }) => {
      const craftsman = await context.craftsmen.find(input);
      if (!craftsman) throw new ORPCError("NOT_FOUND");

      return craftsman;
    }),
  },
});
