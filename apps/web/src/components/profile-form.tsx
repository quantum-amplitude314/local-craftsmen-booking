"use client";

import { CRAFTS, type Location } from "@local-craftsmen/contracts";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { saveProfile } from "@/app/profile-actions";
import { OptionCombobox } from "@/components/option-combobox";
import { PendingButton } from "@/components/pending-button";
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ProfileField,
  type ProfileFormState,
  type ProfileValues,
  validateProfileValues,
} from "@/lib/profile-form";
import { useMutation } from "@/lib/use-mutation";

const initialState: ProfileFormState = {};
const bioMaxLength = 2000;

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
  const { state, run, pending } = useMutation({
    action: saveProfile,
    initialState,
    failureState: { error: "saveFailed" },
  });
  const [values, setValues] = useState(initialValues);
  const [clientState, setClientState] = useState<ProfileFormState | null>(null);
  const [editedFields, setEditedFields] = useState<ProfileField[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const { error, fieldErrors, saved } = clientState ?? state;

  const fieldError = (field: ProfileField) => {
    const key = !editedFields.includes(field) ? fieldErrors?.[field] : undefined;
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

  const handleSave = () => {
    if (pending) return;
    const { parsed, state: validationState } = validateProfileValues(values);
    setEditedFields([]);
    setClientState(parsed.success ? null : validationState);
    if (parsed.success) run(values);
  };

  const { craft, city, district, bio, rate } = values;
  const craftOptions = CRAFTS.map((value) => ({ value, label: tCrafts(value) }));
  const cityOptions = locations.map(({ id }) => ({ value: id, label: tCities(id) }));
  const districtOptions = (locations.find(({ id }) => id === city)?.districts ?? []).map(
    ({ id, name }) => ({ value: id, label: name }),
  );
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
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
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
                <SelectGroup>
                  {craftOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
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
            <OptionCombobox
              id="profile-city"
              options={cityOptions}
              value={city}
              disabled={pending}
              placeholder={t("cityPlaceholder")}
              emptyLabel={t("noMatches")}
              invalid={!!cityError}
              describedBy={describedBy({ errorId: "profile-city-error", error: cityError })}
              onValueChange={(value) => updateField({ field: "city", value })}
            />
            <FieldError id="profile-city-error">{cityError}</FieldError>
          </Field>

          {districtOptions.length > 0 && (
            <Field data-invalid={!!districtError}>
              <FieldLabel htmlFor="profile-district">{t("district")}</FieldLabel>
              <OptionCombobox
                id="profile-district"
                options={districtOptions}
                value={district}
                disabled={pending}
                clearable
                placeholder={t("districtPlaceholder")}
                emptyLabel={t("noMatches")}
                invalid={!!districtError}
                describedBy={describedBy({
                  errorId: "profile-district-error",
                  error: districtError,
                })}
                onValueChange={(value) => updateField({ field: "district", value })}
              />
              <FieldError id="profile-district-error">{districtError}</FieldError>
            </Field>
          )}
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

      <div className="grid items-center gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="min-h-6 min-w-0">
          <FieldError id="profile-error" tabIndex={-1}>
            {editedFields.length === 0 && error ? t(`errors.${error}`) : null}
          </FieldError>
          <p
            role="status"
            data-visible={!pending && editedFields.length === 0 && saved}
            className="text-sm text-primary opacity-0 transition-opacity duration-200 data-[visible=true]:opacity-100"
          >
            {!pending && editedFields.length === 0 && saved ? t("saved") : null}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{t("requiredNote")}</p>
        <PendingButton
          type="submit"
          size="lg"
          pending={pending}
          label={t("save")}
          pendingLabel={t("saving")}
          onClick={(event) => {
            event.preventDefault();
            handleSave();
          }}
        />
      </div>
    </form>
  );
}
