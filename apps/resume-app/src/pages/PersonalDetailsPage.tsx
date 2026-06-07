import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Check, Lightbulb, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/form/Button";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/form/Input";
import { useResume } from "@/lib/resume-context";
import type { PersonalInfo } from "@/lib/types/PersonalInfo";

const personalSchema = z.object({
  fullName: z.string().min(1, "Required 请填写"),
  title: z.string().optional(),
  email: z.string().email("Invalid email 邮箱格式不正确").optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof personalSchema>;

const EXTRA_BUTTONS: { key: string; label: string }[] = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "website", label: "Website 网站" },
  { key: "nationality", label: "Nationality 国籍" },
  { key: "dateOfBirth", label: "Date of Birth 生日" },
  { key: "visa", label: "Visa 签证" },
  { key: "passportOrId", label: "Passport or ID 护照/证件" },
  { key: "availability", label: "Availability 入职时间" },
];

/// Edit Personal Details panel (prototype screen 2). On submit, dispatches a
/// `setPersonal` action and triggers `save()`, then routes back to the editor.
export function PersonalDetailsPage() {
  const { resume, dispatch, save, status } = useResume();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(personalSchema),
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
    navigate("/");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full flex-col bg-surface-card"
    >
      <header className="flex items-center justify-between border-b border-surface-muted px-8 py-5">
        <h1 className="text-xl font-semibold text-ink-900">
          Edit Personal Details 编辑个人信息
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm text-ink-700"
          >
            <Lightbulb size={14} /> Get Tips 获取提示
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={() => navigate("/")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-surface-muted text-ink-700"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[1fr_240px] gap-8 overflow-auto px-8 py-6">
        <div className="flex flex-col gap-5">
          <Field label="Full name 姓名" htmlFor="fullName" error={errors.fullName?.message}>
            <Input
              id="fullName"
              placeholder="Enter your title, first- and last name"
              {...register("fullName")}
            />
          </Field>

          <Field label="Professional title 职位" htmlFor="title">
            <Input
              id="title"
              placeholder="Target position or current role"
              {...register("title")}
            />
          </Field>

          <Field label="Email 邮箱" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" placeholder="Enter email" {...register("email")} />
          </Field>

          <Field label="Phone 电话" htmlFor="phone">
            <Input id="phone" placeholder="Enter phone" {...register("phone")} />
          </Field>

          <Field label="Location 地址" htmlFor="location">
            <Input id="location" placeholder="City, Country" {...register("location")} />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">
              Add details 附加信息
            </p>
            <div className="flex flex-wrap gap-2">
              {EXTRA_BUTTONS.map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-pill bg-surface-tag px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-surface"
                >
                  <Plus size={14} />
                  {btn.label}
                </button>
              ))}
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-pill bg-surface-card px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-card"
              >
                Show More 展开更多
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-ink-900">Photo 头像</p>
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-surface-tag text-ink-300">
            <Camera size={32} />
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-end border-t border-surface-muted px-8 py-4">
        <Button type="submit" disabled={isSubmitting || status === "saving"}>
          <Check size={16} />
          Done 完成
        </Button>
      </footer>
    </form>
  );
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}
