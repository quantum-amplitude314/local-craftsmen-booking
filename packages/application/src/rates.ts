import { type CraftsmanRate, currencySchema } from "@local-craftsmen/contracts";
import { craftsmanRate, type Db } from "@local-craftsmen/db";
import { inArray } from "drizzle-orm";

export const readRates = async ({ db, ids }: { db: Db; ids: string[] }) => {
  const ratesByCraftsman = new Map<string, CraftsmanRate[]>();
  if (ids.length === 0) return ratesByCraftsman;

  const rows = await db
    .select()
    .from(craftsmanRate)
    .where(inArray(craftsmanRate.craftsmanId, ids))
    .orderBy(craftsmanRate.currency);
  for (const { craftsmanId, currency, hourlyRate } of rows) {
    const rates = ratesByCraftsman.get(craftsmanId) ?? [];
    rates.push({ currency: currencySchema.parse(currency), hourlyRate });
    ratesByCraftsman.set(craftsmanId, rates);
  }

  return ratesByCraftsman;
};
