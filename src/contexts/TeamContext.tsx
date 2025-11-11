import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Team {
  id: string;
  name: string;
  description: string | null;
}

interface TeamContextType {
  selectedTeam: Team | null;
  teams: Team[];
  setSelectedTeam: (team: Team | null) => void;
  isLoading: boolean;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select(`
          team:teams (
            id,
            name,
            description
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      const userTeams = teamMembers
        ?.map((tm: any) => tm.team)
        .filter(Boolean) as Team[];

      setTeams(userTeams || []);

      // Auto-select first team if none selected
      if (!selectedTeam && userTeams?.length > 0) {
        const savedTeamId = localStorage.getItem("selectedTeamId");
        const teamToSelect = userTeams.find(t => t.id === savedTeamId) || userTeams[0];
        setSelectedTeam(teamToSelect);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTeams();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedTeam) {
      localStorage.setItem("selectedTeamId", selectedTeam.id);
    }
  }, [selectedTeam]);

  const refreshTeams = async () => {
    await fetchTeams();
  };

  return (
    <TeamContext.Provider
      value={{ selectedTeam, teams, setSelectedTeam, isLoading, refreshTeams }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
