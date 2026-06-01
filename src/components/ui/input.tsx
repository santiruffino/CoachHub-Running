import * as React from "react"
import { cn } from "@/lib/utils"

const inputBase =
    "flex w-full text-sm text-endurix-black dark:text-foreground placeholder:text-endurix-black/30 dark:placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"

const inputVariantStyles = {
    underline:
        "h-10 bg-transparent border-0 border-b border-endurix-black/15 dark:border-border rounded-none px-0 py-2 focus-visible:border-endurix-orange focus-visible:shadow-[0_4px_12px_rgba(255,104,0,0.08)]",
    boxed:
        "h-10 rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
} as const

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: keyof typeof inputVariantStyles
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, variant = "underline", ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    inputBase,
                    inputVariantStyles[variant],
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
