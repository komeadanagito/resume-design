import { forwardRef, type InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={[
        "w-full rounded-xl border border-transparent bg-surface-muted",
        "px-4 py-3 text-base text-ink-900 placeholder:text-ink-300",
        "outline-none transition focus:border-brand-500 focus:bg-surface-card",
        className,
      ].join(" ")}
      {...rest}
    />
  );
});
