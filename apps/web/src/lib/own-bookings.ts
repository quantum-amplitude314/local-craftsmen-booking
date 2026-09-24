import "server-only";

import { apiClient } from "@/lib/api";

/** Everything the customer has ever booked, oldest first, as the API orders it. */
export const getOwnBookings = async () => {
  const bookings = await apiClient.me.bookings.list();
  const page = { bookings, now: new Date().toISOString() };

  return page;
};
