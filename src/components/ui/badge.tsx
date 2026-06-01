import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "rounded-full border border-transparent bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-semibold hover:bg-primary/80",
                secondary:
                    "rounded-full border border-transparent bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold hover:bg-secondary/80",
                destructive:
                    "rounded-full border border-transparent bg-destructive text-destructive-foreground px-2.5 py-0.5 text-xs font-semibold hover:bg-destructive/80",
                outline: "rounded-full text-foreground px-2.5 py-0.5 text-xs",
                solid:
                    "bg-endurix-black dark:bg-white text-white dark:text-endurix-black text-[10px] font-bold tracking-widest px-3 py-1.5 uppercase",
                orange:
                    "bg-endurix-orange text-white text-[7px] font-bold tracking-widest px-2 py-0.5 uppercase",
                tag:
                    "border border-endurix-black/20 dark:border-border gap-1.5 px-3 py-1 text-[9px] font-medium tracking-wider uppercase",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
