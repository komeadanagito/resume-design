import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/// Styled `<select>` that matches the Input component's visual language.
/// Wraps a native select with a custom chevron overlay so it looks consistent
/// across browsers while preserving full keyboard accessibility.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className = "", children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={[
            "w-full appearance-none rounded-xl border border-transparent bg-surface-muted",
            "px-4 py-3 pr-10 text-base text-ink-900",
            "outline-none transition focus:border-brand-500 focus:bg-surface-card",
            "cursor-pointer",
            className,
          ].join(" ")}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
        />
      </div>
    );
  },
);
