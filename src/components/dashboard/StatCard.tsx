import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  change?: string;
  icon: LucideIcon;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: StatCardProps) {
  // Determine if change is positive or negative
  const isPositive = change?.startsWith('+');
  const isNegative = change?.startsWith('-');
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold">{value}</p>
            {change && (
              <div className={`flex items-center gap-1 text-sm font-medium ${
                isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {isPositive && <TrendingUp className="h-4 w-4" />}
                {isNegative && <TrendingDown className="h-4 w-4" />}
                <span>{change}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
