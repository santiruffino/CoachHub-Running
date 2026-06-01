import * as React from "react"
import { cn } from "@/lib/utils"

const textareaBase =
    "flex w-full text-sm text-endurix-black dark:text-foreground placeholder:text-endurix-black/30 dark:placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"

const textareaVariantStyles = {
    underline:
        "min-h-[80px] bg-transparent border-0 border-b border-endurix-black/15 dark:border-border rounded-none px-0 py-2 focus-visible:border-endurix-orange focus-visible:shadow-[0_4px_12px_rgba(255,104,0,0.08)]",
    boxed:
        "min-h-[80px] rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
} as const

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    variant?: keyof typeof textareaVariantStyles
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, variant = "underline", ...props }, ref) => {
        return (
            <textarea
                className={cn(textareaBase, textareaVariantStyles[variant], className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }
