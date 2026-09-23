import { z } from "zod";

export const currencySchema = z.enum(["CZK", "EUR", "USD", "PLN"]);
export const CURRENCIES = currencySchema.options;
export type Currency = z.infer<typeof currencySchema>;

// Decimal strings preserve the database's exact amounts across the API boundary.
export const hourlyRateSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  .refine((amount) => Number(amount) > 0);

export const craftsmanRateSchema = z.object({
  currency: currencySchema,
  hourlyRate: hourlyRateSchema,
});

export type CraftsmanRate = z.infer<typeof craftsmanRateSchema>;

export const profileRatesInputSchema = z
  .array(
    craftsmanRateSchema.extend({
      hourlyRate: z.string().regex(/^[1-9]\d{0,9}$/, { error: "wholeRate" }),
    }),
  )
  .min(1, { error: "rateRequired" })
  .max(CURRENCIES.length, { error: "invalidRates" })
  .refine((rates) => new Set(rates.map(({ currency }) => currency)).size === rates.length, {
    error: "duplicateCurrency",
  });
