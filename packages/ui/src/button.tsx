"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
const variants = cva(
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#d9f36d] text-[#17221b] hover:bg-[#e4ff82]",
        outline: "border border-current bg-transparent hover:opacity-75",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variants> {}
export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(variants({ variant }), className)} {...props} />;
}
