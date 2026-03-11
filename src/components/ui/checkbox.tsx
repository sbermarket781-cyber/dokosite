"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, className, disabled }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200",
        checked
          ? "border-[#FF6200] bg-[#FF6200] text-white"
          : "border-neutral-600 bg-neutral-900 hover:border-neutral-500",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {checked && <Check className="h-4 w-4" />}
    </button>
  );
}
