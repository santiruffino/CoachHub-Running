import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { format } from "date-fns";

interface SessionItemProps {
  name: string;
  activityType: string;
  duration?: number;
  date: Date;
  status: "Programada" | "Completada";
  icon: React.ReactNode;
}

export function SessionItem({
  name,
  activityType,
  duration,
  date,
  status,
  icon,
}: SessionItemProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{name}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span>{activityType}</span>
            {duration && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {duration} min
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {format(date, "d MMM")}
        </span>
        <Badge variant="outline">
          {status}
        </Badge>
      </div>
    </div>
  );
}