import {
  type CraftsmanProfile,
  currencySchema,
  profileInputSchema,
} from "@local-craftsmen/contracts";

// The form offers CZK only; the API still accepts every supported currency.
const formCurrency = currencySchema.enum.CZK;

export type ProfileValues = {
  craft: string;
  city: string;
  district: string;
  bio: string;
  rate: string;
};

export type ProfileField = keyof ProfileValues;
type ValidationError = "invalidValue" | "wholeRate" | "craftRequired" | "cityRequired";

export type ProfileFormState = {
  error?: "checkFields" | "saveFailed" | "unauthorized" | "rateInUse";
  saved?: boolean;
  values?: ProfileValues;
  fieldErrors?: Partial<Record<ProfileField, ValidationError>>;
};

export const getProfileValues = (profile: CraftsmanProfile | null) => {
  if (!profile) {
    const values: ProfileValues = { craft: "", city: "", district: "", bio: "", rate: "" };

    return values;
  }
  const { craft, baseArea, bio, rates } = profile;
  const { cityId, districtId } = baseArea;
  const savedRate = rates.find(({ currency }) => currency === formCurrency)?.hourlyRate;
  const values: ProfileValues = {
    craft,
    city: cityId,
    district: districtId ?? "",
    bio: bio ?? "",
    rate: savedRate?.replace(/\.0+$/, "") ?? "",
  };

  return values;
};

export const validateProfileValues = (input: ProfileValues) => {
  const text = (field: ProfileField) =>
    typeof input?.[field] === "string" ? input[field].trim() : "";
  const values: ProfileValues = {
    craft: text("craft"),
    city: text("city"),
    district: text("district"),
    bio: text("bio"),
    rate: text("rate"),
  };
  const { craft, city, district, bio, rate } = values;
  const rateInputs = rate ? [{ currency: formCurrency, hourlyRate: rate }] : [];
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
      if (field === "rates")
        fieldErrors.rate = typeof child === "number" ? "wholeRate" : "invalidValue";
      else if (field === "baseArea") {
        if (child === "districtId") fieldErrors.district = "invalidValue";
        else fieldErrors.city = city ? "invalidValue" : "cityRequired";
      } else if (field === "craft") fieldErrors.craft = craft ? "invalidValue" : "craftRequired";
      else if (field === "bio") fieldErrors.bio = "invalidValue";
    }
  }
  const state: ProfileFormState = parsed.success
    ? { values }
    : { error: "checkFields", values, fieldErrors };
  const result = { parsed, state, values };

  return result;
};
