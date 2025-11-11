import { useTeam } from "@/contexts/TeamContext";
import { Badge } from "@/components/ui/badge";
import { Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TeamFilterBadge() {
  const { selectedTeam, setSelectedTeam } = useTeam();

  if (!selectedTeam) return null;

  return (
    <Badge variant="secondary" className="gap-2 pr-1">
      <Users className="h-3 w-3" />
      <span>Team: {selectedTeam.name}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 hover:bg-transparent"
        onClick={() => setSelectedTeam(null)}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}
