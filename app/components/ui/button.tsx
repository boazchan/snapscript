// src/components/ui/button.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = ({
  variant,
  size,
  className,
}: {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) => {
  let baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  let variantClasses = "";
  let sizeClasses = "";

  switch (variant) {
    case "default":
      variantClasses = "bg-primary text-primary-foreground hover:bg-primary/90";
      break;
    case "outline":
      variantClasses = "border border-input bg-background hover:bg-accent hover:text-accent-foreground";
      break;
    case "secondary":
      variantClasses = "bg-secondary text-secondary-foreground hover:bg-secondary/80";
      break;
    case "ghost":
      variantClasses = "hover:bg-accent hover:text-accent-foreground";
      break;
    case "link":
      variantClasses = "text-primary underline-offset-4 hover:underline";
      break;
    default:
      variantClasses = "bg-primary text-primary-foreground hover:bg-primary/90";
      break;
  }

  switch (size) {
    case "default":
      sizeClasses = "h-9 px-4 py-2";
      break;
    case "sm":
      sizeClasses = "h-8 rounded-md px-3 text-xs";
      break;
    case "lg":
      sizeClasses = "h-10 rounded-md px-8";
      break;
    case "icon":
      sizeClasses = "h-9 w-9";
      break;
    default:
      sizeClasses = "h-9 px-4 py-2";
      break;
  }

  return cn(baseClasses, variantClasses, sizeClasses, className);
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
