import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-white shadow-card hover:bg-brand-600",
  secondary:
    "bg-surface-card text-ink-900 border border-surface-muted hover:bg-surface-muted",
  ghost: "bg-transparent text-ink-700 hover:bg-surface-muted",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-button",
        "px-6 py-3.5 text-base font-bold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});
