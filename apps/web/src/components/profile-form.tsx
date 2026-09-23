"use client";

import { CRAFTS, CURRENCIES, type Location } from "@local-craftsmen/contracts";
import { useLocale, useTranslations } from "next-intl";
import { type SubmitEvent, useActionState, useEffect, useRef, useState } from "react";
import { saveProfile } from "@/app/profile-actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type ProfileField,
  type ProfileFormState,
  type ProfileValues,
  validateProfileForm,
} from "@/lib/profile-form";

const initialState: ProfileFormState = {};

export function ProfileForm({
  initialValues,
  locations,
}: {
  initialValues: ProfileValues;
  locations: Location[];
}) {
  const locale = useLocale();
  const t = useTranslations("profile");
  const tCrafts = useTranslations("directory.crafts");
  const tCities = useTranslations("cities");
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  const [values, setValues] = useState(state.values ?? initialValues);
  const [clientState, setClientState] = useState<ProfileFormState | null>(null);
  const [editedFields, setEditedFields] = useState<ProfileField[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const { error, fieldErrors, saved } = clientState ?? state;

  const fieldError = (field: ProfileField) => {
    const key = !pending && !editedFields.includes(field) ? fieldErrors?.[field] : undefined;
    const message = key ? t(`validation.${key}`) : undefined;

    return message;
  };

  const markEdited = (field: ProfileField) => {
    setEditedFields((fields) => (fields.includes(field) ? fields : [...fields, field]));
  };

  const updateField = ({
    field,
    value,
  }: {
    field: Exclude<keyof ProfileValues, "rates">;
    value: string;
  }) => {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "city" ? { district: "" } : {}),
    }));
    markEdited(field);
  };

  useEffect(() => {
    const { error } = clientState ?? state;
    if (pending || !error) return;
    const { current: form } = formRef;
    const target =
      form?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form?.querySelector<HTMLElement>("#profile-error");
    target?.focus();
  }, [clientState, state, pending]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    const { currentTarget } = event;
    const { parsed, state: validationState } = validateProfileForm(new FormData(currentTarget));
    setEditedFields([]);
    setClientState(parsed.success ? null : validationState);
    if (!parsed.success) event.preventDefault();
  };

  const { craft, city, district, bio, rates } = values;
  const districts = locations.find(({ id }) => id === city)?.districts ?? [];
  const craftError = fieldError("craft");
  const cityError = fieldError("city");
  const districtError = fieldError("district");
  const bioError = fieldError("bio");
  const ratesError = fieldError("rates");

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={pending}
      className="flex max-w-2xl flex-col gap-8"
    >
      <input type="hidden" name="locale" value={locale} />
      <FieldGroup>
        <FieldSet data-invalid={!!craftError}>
          <FieldLegend id="profile-craft-label" variant="label">
            {t("craft")}
          </FieldLegend>
          <ToggleGroup
            variant="outline"
            className="flex-wrap"
            value={craft ? [craft] : []}
            disabled={pending}
            aria-labelledby="profile-craft-label"
            aria-invalid={!!craftError}
            aria-describedby={craftError ? "profile-craft-error" : undefined}
            tabIndex={-1}
            onValueChange={([value]) => {
              if (value) updateField({ field: "craft", value });
            }}
          >
            {CRAFTS.map((option) => (
              <ToggleGroupItem key={option} value={option}>
                {tCrafts(option)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <input type="hidden" name="craft" value={craft} />
          <FieldError id="profile-craft-error">{craftError}</FieldError>
        </FieldSet>

        <FieldSet>
          <FieldLegend>{t("baseArea")}</FieldLegend>
          <FieldDescription>{t("baseAreaHint")}</FieldDescription>
          <FieldGroup>
            <FieldSet data-invalid={!!cityError}>
              <FieldLegend id="profile-city-label" variant="label">
                {t("city")}
              </FieldLegend>
              <ToggleGroup
                variant="outline"
                className="flex-wrap"
                value={city ? [city] : []}
                disabled={pending}
                aria-labelledby="profile-city-label"
                aria-invalid={!!cityError}
                aria-describedby={cityError ? "profile-city-error" : undefined}
                tabIndex={-1}
                onValueChange={([value]) => {
                  if (value) updateField({ field: "city", value });
                }}
              >
                {locations.map(({ id }) => (
                  <ToggleGroupItem key={id} value={id}>
                    {tCities(id)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <input type="hidden" name="city" value={city} />
              <FieldError id="profile-city-error">{cityError}</FieldError>
            </FieldSet>
            <FieldSet data-invalid={!!districtError}>
              <FieldLegend id="profile-district-label" variant="label">
                {t("district")}
              </FieldLegend>
              <ToggleGroup
                variant="outline"
                className="flex-wrap"
                value={district ? [district] : []}
                disabled={pending}
                aria-labelledby="profile-district-label"
                aria-invalid={!!districtError}
                aria-describedby={districtError ? "profile-district-error" : undefined}
                onValueChange={([value]) => {
                  updateField({ field: "district", value: value ?? "" });
                }}
              >
                {districts.map(({ id, name }) => (
                  <ToggleGroupItem key={id} value={id}>
                    {name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <input type="hidden" name="district" value={district} />
              <FieldError id="profile-district-error">{districtError}</FieldError>
            </FieldSet>
          </FieldGroup>
        </FieldSet>

        <FieldSet data-invalid={!!ratesError}>
          <FieldLegend>{t("rates")}</FieldLegend>
          <FieldDescription id="profile-rates-hint">{t("ratesHint")}</FieldDescription>
          <FieldGroup className="grid sm:grid-cols-2">
            {CURRENCIES.map((currency) => {
              const key = `rate.${currency}` as const;
              const message = fieldError(key) ?? ratesError;

              return (
                <Field key={currency} data-invalid={!!message}>
                  <FieldLabel htmlFor={`profile-rate-${currency}`}>
                    {t("rateLabel", { currency })}
                  </FieldLabel>
                  <Input
                    id={`profile-rate-${currency}`}
                    name={key}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={rates[currency]}
                    readOnly={pending}
                    aria-invalid={!!message}
                    aria-describedby={`profile-rates-hint${message ? ` profile-rate-${currency}-error` : ""}`}
                    onChange={({ currentTarget }) => {
                      const { value } = currentTarget;
                      setValues(({ rates, ...current }) => ({
                        ...current,
                        rates: { ...rates, [currency]: value },
                      }));
                      markEdited(key);
                      markEdited("rates");
                    }}
                  />
                  <FieldError id={`profile-rate-${currency}-error`}>{message}</FieldError>
                </Field>
              );
            })}
          </FieldGroup>
        </FieldSet>

        <Field data-invalid={!!bioError}>
          <FieldLabel htmlFor="profile-bio">{t("bio")}</FieldLabel>
          <Textarea
            id="profile-bio"
            name="bio"
            value={bio}
            readOnly={pending}
            maxLength={2000}
            rows={4}
            aria-invalid={!!bioError}
            aria-describedby={bioError ? "profile-bio-error" : undefined}
            onChange={({ currentTarget }) => {
              const { value } = currentTarget;
              updateField({ field: "bio", value });
            }}
          />
          <FieldError id="profile-bio-error">{bioError}</FieldError>
        </Field>
      </FieldGroup>
      <FieldError id="profile-error" tabIndex={-1}>
        {!pending && editedFields.length === 0 && error ? t(`errors.${error}`) : null}
      </FieldError>
      <p role="status" className="text-sm text-muted-foreground">
        {!pending && editedFields.length === 0 && saved ? t("saved") : null}
      </p>
      <Button type="submit" size="lg" className="self-start" disabled={pending}>
        {t(pending ? "saving" : "save")}
      </Button>
    </form>
  );
}
