
export interface Team {
  id: number;
  name: string;
  color_hex: string;
  icon: string;
}

export interface User {
  id: number;
  username: string;
  team_id: number;
  avatar_emoji: string;
  raffle_tickets: number; // Used for weekly entry (0 or 1)
  grand_prize_entry: boolean; // Used for monthly entry
  banked_steps: number; 
}

export interface ActivityLog {
  id: number;
  user_id: number;
  step_count: number;
  date_logged: string; // YYYY-MM-DD
  activity_type: 'Walking' | 'Running' | 'Bonus: Hydration' | 'Bonus: Meditation' | 'Bonus: Sleep' | 'Bonus: Sauna' | 'Bonus: Cold Plunge' | 'Bonus: Stretch' | 'Bonus: Detox' | 'Bonus: Lifting' | 'Bonus: Gratitude';
}

export interface TeamStats {
  team: Team;
  totalSteps: number;
  memberCount: number;
  averageSteps: number;
  members: User[];
}

export interface UserStats {
  user: User;
  teamName: string;
  totalSteps: number;
  streak: number;
  badges: Badge[];
}

export interface GlobalProgress {
  totalSteps: number;
  goal: number;
  percentage: number;
  currentLocation: string;
}

export interface DailyTeamStat {
  date: string;
  teams: {
    teamId: number;
    totalSteps: number;
  }[];
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
  description: string;
  earned: boolean;
}

export interface DailyQuest {
  id: string;
  label: string;
  description: string;
  icon: string;
  targetValue?: number; // e.g. 1000 steps
}
