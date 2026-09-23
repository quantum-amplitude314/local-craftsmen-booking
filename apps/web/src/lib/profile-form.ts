import {
  type CraftsmanProfile,
  CURRENCIES,
  type Currency,
  profileInputSchema,
} from "@local-craftsmen/contracts";

export type ProfileValues = {
  craft: string;
  city: string;
  district: string;
  bio: string;
  rates: Record<Currency, string>;
};

export type ProfileField = Exclude<keyof ProfileValues, "rates"> | "rates" | `rate.${Currency}`;
type ValidationError = "invalidValue" | "wholeRate";

export type ProfileFormState = {
  error?: "checkFields" | "saveFailed" | "unauthorized" | "rateInUse";
  saved?: boolean;
  values?: ProfileValues;
  fieldErrors?: Partial<Record<ProfileField, ValidationError>>;
};

const emptyRates = () =>
  Object.fromEntries(CURRENCIES.map((currency) => [currency, ""])) as Record<Currency, string>;

export const getProfileValues = (profile: CraftsmanProfile | null) => {
  const rates = emptyRates();
  if (!profile) {
    const values: ProfileValues = {
      craft: "",
      city: "",
      district: "",
      bio: "",
      rates,
    };

    return values;
  }
  const { craft, baseArea, bio, rates: savedRates } = profile;
  const { cityId, districtId } = baseArea;
  for (const { currency, hourlyRate } of savedRates) {
    rates[currency] = hourlyRate.replace(/\.0+$/, "");
  }
  const values: ProfileValues = {
    craft,
    city: cityId,
    district: districtId ?? "",
    bio: bio ?? "",
    rates,
  };

  return values;
};

export const validateProfileForm = (formData: FormData) => {
  const text = (name: string) => {
    const entry = formData.get(name);

    return typeof entry === "string" ? entry.trim() : "";
  };
  const rates = emptyRates();
  for (const currency of CURRENCIES) rates[currency] = text(`rate.${currency}`);
  const values: ProfileValues = {
    craft: text("craft"),
    city: text("city"),
    district: text("district"),
    bio: text("bio"),
    rates,
  };
  const { craft, city, district, bio } = values;
  const rateInputs = CURRENCIES.filter((currency) => rates[currency] !== "").map((currency) => ({
    currency,
    hourlyRate: rates[currency],
  }));
  const parsed = profileInputSchema.safeParse({
    craft,
    baseArea: {
      cityId: city,
      districtId: district || null,
    },
    bio: bio || null,
    rates: rateInputs,
  });
  const fieldErrors: ProfileFormState["fieldErrors"] = {};
  if (!parsed.success) {
    for (const { path } of parsed.error.issues) {
      const [field, child] = path;
      if (field === "rates") {
        const currency = typeof child === "number" ? rateInputs[child]?.currency : undefined;
        if (currency) fieldErrors[`rate.${currency}`] = "wholeRate";
        else fieldErrors.rates = "invalidValue";
      } else if (field === "baseArea") {
        const key = child === "districtId" ? "district" : "city";
        fieldErrors[key] = "invalidValue";
      } else if (field === "craft" || field === "bio") fieldErrors[field] = "invalidValue";
    }
  }
  const state: ProfileFormState = parsed.success
    ? { values }
    : { error: "checkFields", values, fieldErrors };
  const result = { parsed, state, values };

  return result;
};
