import { useTeam } from "@/contexts/TeamContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function TeamSwitcher() {
  const { selectedTeam, teams, setSelectedTeam, isLoading } = useTeam();
  const navigate = useNavigate();
  const [isCandidate, setIsCandidate] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    checkIfCandidate();
  }, []);

  const checkIfCandidate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRoleLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasOnlyCandidateRole = roles?.length === 1 && roles[0].role === 'candidate';
    setIsCandidate(hasOnlyCandidateRole || false);
    setRoleLoading(false);
  };

  // Don't show team switcher for candidates
  if (roleLoading || isCandidate) {
    return null;
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Users className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (teams.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/teams")}
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Team
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          <span className="max-w-[150px] truncate">
            {selectedTeam?.name || "All Teams"}
          </span>
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Team</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setSelectedTeam(null)}>
          {!selectedTeam && <Check className="mr-2 h-4 w-4" />}
          {!selectedTeam || <div className="mr-2 h-4 w-4" />}
          All Teams
        </DropdownMenuItem>
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => setSelectedTeam(team)}
          >
            {selectedTeam?.id === team.id && <Check className="mr-2 h-4 w-4" />}
            {selectedTeam?.id !== team.id && <div className="mr-2 h-4 w-4" />}
            <span className="truncate">{team.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/teams")}>
          <Plus className="mr-2 h-4 w-4" />
          Manage Teams
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
