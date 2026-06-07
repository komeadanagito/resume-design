import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Check, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/form/Button";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/form/Input";
import { useT, type StringKey } from "@/lib/i18n";
import { useResume } from "@/lib/resume-context";
import type { PersonalInfo } from "@/lib/types/PersonalInfo";

export type PersonalEditPanelProps = {
  onDone: () => void;
};

const EXTRA_KEYS: { key: string; labelKey: StringKey }[] = [
  { key: "linkedin", labelKey: "personal.extras.linkedin" },
  { key: "website", labelKey: "personal.extras.website" },
  { key: "nationality", labelKey: "personal.extras.nationality" },
  { key: "dateOfBirth", labelKey: "personal.extras.dateOfBirth" },
  { key: "visa", labelKey: "personal.extras.visa" },
  { key: "passportOrId", labelKey: "personal.extras.passportOrId" },
  { key: "availability", labelKey: "personal.extras.availability" },
];

/// Inline edit panel that replaces the collapsed card in the same column slot
/// when the user clicks the pencil. On submit: dispatches `setPersonal`,
/// triggers `save()`, then calls `onDone()` to collapse back.
export function PersonalEditPanel({ onDone }: PersonalEditPanelProps) {
  const t = useT();
  const { resume, dispatch, save, status } = useResume();

  const schema = z.object({
    fullName: z.string().min(1, t("personal.validation.fullNameRequired")),
    title: z.string().optional(),
    email: z
      .string()
      .email(t("personal.validation.emailInvalid"))
      .optional()
      .or(z.literal("")),
    phone: z.string().optional(),
    location: z.string().optional(),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: resume
      ? {
          fullName: resume.personal.fullName,
          title: resume.personal.title ?? "",
          email: resume.personal.email ?? "",
          phone: resume.personal.phone ?? "",
          location: resume.personal.location ?? "",
        }
      : undefined,
  });

  if (!resume) return null;

  const onSubmit = async (values: FormValues) => {
    const next: PersonalInfo = {
      ...resume.personal,
      fullName: values.fullName,
      title: emptyToNull(values.title),
      email: emptyToNull(values.email),
      phone: emptyToNull(values.phone),
      location: emptyToNull(values.location),
    };
    dispatch({ kind: "setPersonal", personal: next });
    await save();
    onDone();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col rounded-card bg-surface-card shadow-card"
    >
      <header className="flex items-center justify-between px-7 py-6">
        <h2 className="text-xl font-extrabold text-ink-900">
          {t("personal.panelTitle")}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("personal.close")}
            onClick={onDone}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink-700"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_140px] gap-6 px-7 pb-6">
        <div className="flex flex-col gap-4">
          <Field
            label={t("personal.fullName")}
            htmlFor="fullName"
            error={errors.fullName?.message}
          >
            <Input
              id="fullName"
              placeholder={t("personal.fullNamePlaceholder")}
              {...register("fullName")}
            />
          </Field>

          <Field label={t("personal.professionalTitle")} htmlFor="title">
            <Input
              id="title"
              placeholder={t("personal.professionalTitlePlaceholder")}
              {...register("title")}
            />
          </Field>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-ink-900">{t("personal.photo")}</p>
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-tag text-white">
            <Camera size={28} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-7 pb-6">
        <Field
          label={t("personal.email")}
          htmlFor="email"
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            placeholder={t("personal.emailPlaceholder")}
            {...register("email")}
          />
        </Field>

        <Field label={t("personal.phone")} htmlFor="phone">
          <Input
            id="phone"
            placeholder={t("personal.phonePlaceholder")}
            {...register("phone")}
          />
        </Field>

        <Field label={t("personal.location")} htmlFor="location">
          <Input
            id="location"
            placeholder={t("personal.locationPlaceholder")}
            {...register("location")}
          />
        </Field>

        <div className="mt-1">
          <p className="mb-3 text-sm font-bold text-ink-700">
            {t("personal.addDetails")}
          </p>
          <div className="flex flex-wrap gap-2">
            {EXTRA_KEYS.map((btn) => (
              <button
                key={btn.key}
                type="button"
                className="inline-flex items-center gap-1 rounded-pill bg-surface-tag px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-surface"
              >
                <Plus size={14} />
                {t(btn.labelKey)}
              </button>
            ))}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-pill bg-surface-card px-3 py-1.5 text-sm font-bold text-ink-900 shadow-card"
            >
              {t("personal.showMore")}
            </button>
          </div>
        </div>
      </div>

      <footer className="px-7 pb-5">
        <Button
          type="submit"
          disabled={isSubmitting || status === "saving"}
          className="w-full"
        >
          {t("personal.done")} <Check size={16} />
        </Button>
      </footer>
    </form>
  );
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}
