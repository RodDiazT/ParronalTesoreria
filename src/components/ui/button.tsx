import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "danger" | "destructive" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

    const variantStyles = {
      default: "bg-acento text-sobre-acento hover:opacity-95 active:scale-[0.98]",
      secondary: "bg-superficie text-texto hover:bg-borde/70 active:scale-[0.98]",
      outline: "border border-borde bg-fondo text-texto hover:bg-superficie active:scale-[0.98]",
      danger: "bg-gasto text-white hover:opacity-95 active:scale-[0.98]",
      destructive: "bg-gasto text-white hover:opacity-95 active:scale-[0.98]",
      ghost: "text-texto hover:bg-superficie active:scale-[0.98]",
      link: "text-acento underline-offset-4 hover:underline",
    }[variant];

    const sizeStyles = {
      default: "h-11 px-4 py-2 text-sm rounded-xl",
      sm: "h-9 px-3 text-xs rounded-lg",
      lg: "h-12 px-6 text-base rounded-xl font-semibold",
      icon: "h-10 w-10 rounded-xl",
    }[size];

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles, sizeStyles, className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
