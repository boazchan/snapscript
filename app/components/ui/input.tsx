import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={`border px-4 py-2 rounded-md w-full ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"
