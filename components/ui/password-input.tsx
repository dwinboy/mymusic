"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A password field someone can check before submitting it.
 *
 * Plain `type="password"` has no way back if a thumb slips on a phone
 * keyboard — the field goes red, or the request comes back "incorrect
 * password," and there was never a chance to notice the typo. The toggle is
 * visibility only: nothing here weakens autocomplete or browser password
 * managers, which still see a password field either way.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          // aria-pressed rather than a value announced only by icon swap, for
          // anyone not seeing the icon change.
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg text-foreground-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
