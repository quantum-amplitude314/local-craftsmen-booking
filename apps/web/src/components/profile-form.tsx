"use client";

import { CRAFTS, type Location } from "@local-craftsmen/contracts";
import { useTranslations } from "next-intl";
import {
  type ReactNode,
  type SubmitEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { saveProfile } from "@/app/profile-actions";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { matchesWordStart } from "@/lib/option-filter";
import {
  type ProfileField,
  type ProfileFormState,
  type ProfileValues,
  validateProfileForm,
} from "@/lib/profile-form";

const initialState: ProfileFormState = {};
const bioMaxLength = 2000;

type Option = { value: string; label: string };

const isSameOption = (option: Option, selected: Option) => option.value === selected.value;

const optionFilter = (selected: Option | null) => (option: Option, query: string) =>
  query === selected?.label || matchesWordStart({ label: option.label, query });

function FormSection({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="grid gap-4 border-b py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-heading`} className="font-medium">
          {title}
        </h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

export function ProfileForm({
  initialValues,
  locations,
}: {
  initialValues: ProfileValues;
  locations: Location[];
}) {
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

  const updateField = ({ field, value }: { field: ProfileField; value: string }) => {
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

  const { craft, city, district, bio, rate } = values;
  const craftOptions = CRAFTS.map((value) => ({ value, label: tCrafts(value) }));
  const cityOptions = locations.map(({ id }) => ({ value: id, label: tCities(id) }));
  const districtOptions = (locations.find(({ id }) => id === city)?.districts ?? []).map(
    ({ id, name }) => ({ value: id, label: name }),
  );
  const selectedCity = cityOptions.find(({ value }) => value === city) ?? null;
  const selectedDistrict = districtOptions.find(({ value }) => value === district) ?? null;
  const describedBy = ({
    hintId,
    errorId,
    error,
  }: {
    hintId?: string | undefined;
    errorId: string;
    error?: string | undefined;
  }) => [hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  const craftError = fieldError("craft");
  const cityError = fieldError("city");
  const districtError = fieldError("district");
  const bioError = fieldError("bio");
  const rateError = fieldError("rate");
  const requiredMark = (
    <>
      <span aria-hidden="true"> *</span>
      <span className="sr-only">{t("required")}</span>
    </>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={pending}
      className="flex max-w-5xl flex-col border-t"
    >
      <FormSection id="services" title={t("sections.services")} hint={t("sections.servicesHint")}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={!!craftError}>
            <FieldLabel htmlFor="profile-craft">
              {t("craft")}
              {requiredMark}
            </FieldLabel>
            <Select
              items={craftOptions}
              value={craft || null}
              disabled={pending}
              onValueChange={(value) => {
                if (value) updateField({ field: "craft", value });
              }}
            >
              <SelectTrigger
                id="profile-craft"
                className="w-full"
                aria-invalid={!!craftError}
                aria-describedby={describedBy({
                  errorId: "profile-craft-error",
                  error: craftError,
                })}
              >
                <SelectValue placeholder={t("craftPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {craftOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="craft" value={craft} />
            <FieldError id="profile-craft-error">{craftError}</FieldError>
          </Field>

          <Field data-invalid={!!rateError}>
            <FieldLabel htmlFor="profile-rate">{t("rate")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="profile-rate"
                name="rate"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={rate}
                readOnly={pending}
                aria-invalid={!!rateError}
                aria-describedby={`profile-rate-unit ${describedBy({ hintId: "profile-rate-hint", errorId: "profile-rate-error", error: rateError })}`}
                onChange={({ currentTarget }) => {
                  const { value } = currentTarget;
                  updateField({ field: "rate", value });
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText id="profile-rate-unit">{t("rateUnit")}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription id="profile-rate-hint">{t("rateHint")}</FieldDescription>
            <FieldError id="profile-rate-error">{rateError}</FieldError>
          </Field>
        </div>
      </FormSection>

      <FormSection id="base-area" title={t("baseArea")} hint={t("baseAreaHint")}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={!!cityError}>
            <FieldLabel htmlFor="profile-city">
              {t("city")}
              {requiredMark}
            </FieldLabel>
            <Combobox
              items={cityOptions}
              value={selectedCity}
              disabled={pending}
              filter={optionFilter(selectedCity)}
              isItemEqualToValue={isSameOption}
              itemToStringLabel={({ label }: Option) => label}
              onValueChange={(option: Option | null) => {
                updateField({ field: "city", value: option?.value ?? "" });
              }}
            >
              <ComboboxInput
                id="profile-city"
                className="w-full"
                placeholder={t("cityPlaceholder")}
                aria-invalid={!!cityError}
                aria-describedby={describedBy({ errorId: "profile-city-error", error: cityError })}
              />
              <ComboboxContent>
                <ComboboxEmpty>{t("noMatches")}</ComboboxEmpty>
                <ComboboxList>
                  {(option: Option) => (
                    <ComboboxItem key={option.value} value={option}>
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <input type="hidden" name="city" value={city} />
            <FieldError id="profile-city-error">{cityError}</FieldError>
          </Field>

          {districtOptions.length > 0 && (
            <Field data-invalid={!!districtError}>
              <FieldLabel htmlFor="profile-district">{t("district")}</FieldLabel>
              <Combobox
                items={districtOptions}
                value={selectedDistrict}
                disabled={pending}
                filter={optionFilter(selectedDistrict)}
                isItemEqualToValue={isSameOption}
                itemToStringLabel={({ label }: Option) => label}
                onValueChange={(option: Option | null) => {
                  updateField({ field: "district", value: option?.value ?? "" });
                }}
              >
                <ComboboxInput
                  id="profile-district"
                  className="w-full"
                  placeholder={t("districtPlaceholder")}
                  showClear={!!district}
                  aria-invalid={!!districtError}
                  aria-describedby={describedBy({
                    errorId: "profile-district-error",
                    error: districtError,
                  })}
                />
                <ComboboxContent>
                  <ComboboxEmpty>{t("noMatches")}</ComboboxEmpty>
                  <ComboboxList>
                    {(option: Option) => (
                      <ComboboxItem key={option.value} value={option}>
                        {option.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldError id="profile-district-error">{districtError}</FieldError>
            </Field>
          )}
          <input type="hidden" name="district" value={district} />
        </div>
      </FormSection>

      <FormSection id="about" title={t("bio")}>
        <Field data-invalid={!!bioError}>
          <InputGroup>
            <InputGroupTextarea
              id="profile-bio"
              name="bio"
              value={bio}
              readOnly={pending}
              maxLength={bioMaxLength}
              placeholder={t("bioPlaceholder")}
              className="min-h-32 max-h-64 overflow-y-auto"
              aria-labelledby="about-heading"
              aria-invalid={!!bioError}
              aria-describedby={describedBy({
                hintId: "profile-bio-count",
                errorId: "profile-bio-error",
                error: bioError,
              })}
              onChange={({ currentTarget }) => {
                const { value } = currentTarget;
                updateField({ field: "bio", value });
              }}
            />
            <InputGroupAddon align="block-end">
              <InputGroupText id="profile-bio-count" className="text-xs">
                {t("bioRemaining", { count: bioMaxLength - bio.length })}
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <FieldError id="profile-bio-error">{bioError}</FieldError>
        </Field>
      </FormSection>

      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 py-8">
        <FieldError id="profile-error" tabIndex={-1} className="mr-auto">
          {!pending && editedFields.length === 0 && error ? t(`errors.${error}`) : null}
        </FieldError>
        <p role="status" className="mr-auto text-sm text-muted-foreground empty:hidden">
          {!pending && editedFields.length === 0 && saved ? t("saved") : null}
        </p>
        <p className="text-sm text-muted-foreground">{t("requiredNote")}</p>
        <Button type="submit" size="lg" disabled={pending}>
          {t(pending ? "saving" : "save")}
        </Button>
      </div>
    </form>
  );
}
