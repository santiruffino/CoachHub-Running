import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AthleteItemProps {
  name: string;
  sport: string;
  level: string;
  avatarColor: string;
  initials: string;
}

export function AthleteItem({
  name,
  sport,
  level,
  avatarColor,
  initials,
}: AthleteItemProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3 flex-1">
        <Avatar className={`h-10 w-10 ${avatarColor}`}>
          <AvatarFallback className="bg-transparent text-white font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">
            {sport} • {level}
          </p>
        </div>
      </div>
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
        Activo
      </Badge>
    </div>
  );
}